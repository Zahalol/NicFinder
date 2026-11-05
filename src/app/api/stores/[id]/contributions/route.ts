import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser, AuthError, stableIpHash } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { parsePriceToCents } from "@/lib/money";
import { countRecentContributions } from "@/lib/rate-limit";
import { parseOptionalQty, cleanText } from "@/lib/validate";
import { selectLatestPrice } from "@/lib/prices";
import {
  decideDispute,
  publishDispute,
  maybePublishCorroborated,
  addReputation,
  REP_DELTAS,
} from "@/lib/reputation";
import { flagObservation, flagDeal } from "@/lib/flags";
import { reportDeal } from "@/lib/deal-reports";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id: storeId } = await params;
    const settings = await getSettings();
    const ipHash = stableIpHash(
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    );

    const recent = await countRecentContributions(user.id);
    if (recent >= settings.contributionRateLimitPerHour) {
      return NextResponse.json(
        { error: "You’ve hit the hourly contribution limit — try again later." },
        { status: 429 }
      );
    }

    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store || store.status !== "ACTIVE")
      return NextResponse.json({ error: "Store not found." }, { status: 404 });

    const body = await req.json().catch(() => null);
    const kind = body?.kind;

    // ----- FLAG a specific (possibly historical) observation ---------------
    // Product line comes from the observation itself, so handle before the
    // productLineId validation below.
    if (kind === "FLAG_OBSERVATION") {
      const result = await flagObservation({
        observationId: String(body?.targetObservationId ?? ""),
        storeId,
        userId: user.id,
        reason: String(body?.comment ?? ""),
      });
      if (!result.ok)
        return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json({
        ok: true,
        message: "Thanks — a moderator will review this observation.",
      });
    }

    // ----- FLAG a deal (no longer offered / wrong) -------------------------
    if (kind === "FLAG_DEAL") {
      const result = await flagDeal({
        dealId: String(body?.dealId ?? ""),
        storeId,
        userId: user.id,
        reason: String(body?.comment ?? ""),
      });
      if (!result.ok)
        return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json({
        ok: true,
        message: "Thanks — a moderator will check this deal.",
      });
    }

    const productLineId = String(body?.productLineId ?? "");
    const productLine = await prisma.productLine.findUnique({ where: { id: productLineId } });
    if (!productLine)
      return NextResponse.json({ error: "Unknown product line." }, { status: 400 });

    // ----- CONFIRM the current observation --------------------------------
    if (kind === "CONFIRM") {
      const obsId = String(body?.targetObservationId ?? "");
      const obs = await prisma.priceObservation.findUnique({
        where: { id: obsId },
      });
      if (!obs || obs.storeId !== storeId || obs.status !== "ACTIVE")
        return NextResponse.json(
          { error: "That price is no longer current — refresh the page." },
          { status: 409 }
        );
      // Availability-only observations carry no price to confirm.
      if (obs.priceCents === null)
        return NextResponse.json(
          { error: "This entry has no price to confirm." },
          { status: 400 }
        );
      // The claimed product line must be the observation's own — a mismatched
      // line previously sidestepped the per-lineage reconfirm cooldown and
      // wrote mis-attributed contributions.
      if (obs.productLineId !== productLineId)
        return NextResponse.json(
          { error: "Product line doesn’t match that price — refresh the page." },
          { status: 400 }
        );

      // Confirming your own community observation is self-confirmation.
      if (obs.contributionId) {
        const origin = await prisma.contribution.findUnique({ where: { id: obs.contributionId } });
        if (origin?.userId === user.id)
          return NextResponse.json(
            { error: "You can’t confirm your own price report." },
            { status: 400 }
          );
      }

      const existing = await prisma.verification.findUnique({
        where: { observationId_userId: { observationId: obs.id, userId: user.id } },
      });
      if (existing)
        return NextResponse.json(
          { error: "You already weighed in on this price." },
          { status: 409 }
        );

      // Cooldown across the store/product lineage
      const lastHere = await prisma.verification.findFirst({
        where: { userId: user.id, observation: { storeId, productLineId } },
        orderBy: { createdAt: "desc" },
      });
      if (
        lastHere &&
        Date.now() - lastHere.createdAt.getTime() <
          settings.reconfirmCooldownDays * 86400_000
      ) {
        return NextResponse.json(
          { error: `You confirmed a price here recently — come back in a few days.` },
          { status: 429 }
        );
      }

      const expired =
        Date.now() - obs.observedAt.getTime() >
        settings.expireAfterDays * 86400_000;

      try {
        await prisma.$transaction(async (tx) => {
          const v = await tx.verification.create({
            data: { observationId: obs.id, userId: user.id, verdict: "CONFIRM" },
          });
          await tx.contribution.create({
            data: {
              userId: user.id,
              storeId,
              productLineId,
              kind: "CONFIRM",
              targetObservationId: obs.id,
              status: "PUBLISHED",
              resolvedAt: new Date(),
            },
          });
          // Confirming expired/ancient data earns nothing.
          if (!expired) {
            await addReputation(
              user.id,
              REP_DELTAS.CONFIRM_ACCURATE,
              "CONFIRM_ACCURATE",
              { type: "verification", id: v.id },
              tx
            );
          }
        });
      } catch (e) {
        // The pre-check above races with concurrent double-submits; the
        // unique (observationId, userId) constraint is the real guard.
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
          return NextResponse.json(
            { error: "You already weighed in on this price." },
            { status: 409 }
          );
        throw e;
      }
      return NextResponse.json({ ok: true, message: "Thanks — confirmation recorded." });
    }

    // ----- REPORT_DEAL: propose a multi-can deal (moderator-reviewed) -----
    if (kind === "REPORT_DEAL") {
      const result = await reportDeal({
        storeId,
        productLineId,
        userId: user.id,
        minQty: body?.minQty,
        dealPrice: body?.dealPrice ?? null,
        dealDiscount: body?.dealDiscount ?? null,
        conditions: body?.conditions,
      });
      if (!result.ok)
        return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json({
        ok: true,
        message: "Thanks — a moderator will review the deal before it’s shown.",
      });
    }

    // ----- DISPUTE: propose a replacement price ---------------------------
    if (kind === "DISPUTE") {
      const priceCents = parsePriceToCents(body?.proposedPrice);
      if (priceCents === null)
        return NextResponse.json({ error: "Enter a valid price like 6.49." }, { status: 400 });

      // proposedQty is optional but must be a sane integer when present —
      // unvalidated Number() here used to accept negatives and crash on NaN.
      const proposedQty = parseOptionalQty(body?.proposedQty);
      if (proposedQty === undefined)
        return NextResponse.json(
          { error: "Quantity must be a whole number between 1 and 100." },
          { status: 400 }
        );

      const activeObs = await prisma.priceObservation.findMany({
        where: { storeId, productLineId, status: "ACTIVE" },
        include: { verifications: true },
      });
      const latest = selectLatestPrice(activeObs, settings);
      const currentPriceCents = latest?.observation.priceCents ?? null;

      if (currentPriceCents !== null && priceCents === currentPriceCents) {
        return NextResponse.json(
          { error: "That matches the current price — use Confirm instead." },
          { status: 400 }
        );
      }

      // Corroboration path: does an open proposal with the same price exist?
      const openProposal = await prisma.contribution.findFirst({
        where: {
          storeId,
          productLineId,
          kind: "DISPUTE",
          status: "CORROBORATING",
          proposedPriceCents: priceCents,
        },
      });
      if (openProposal && openProposal.userId !== user.id) {
        const alreadyCorroborated = await prisma.contribution.findFirst({
          where: {
            kind: "CONFIRM",
            targetObservationId: openProposal.id,
            userId: user.id,
          },
          select: { id: true },
        });
        if (alreadyCorroborated) {
          return NextResponse.json({
            ok: true,
            already: true,
            message: "You already corroborated this report — it still needs other members.",
          });
        }
        await prisma.contribution.create({
          data: {
            userId: user.id,
            storeId,
            productLineId,
            kind: "CONFIRM",
            targetObservationId: openProposal.id, // references the proposal
            status: "PUBLISHED",
            resolvedAt: new Date(),
            comment: body?.comment ? cleanText(body.comment, 500) || null : null,
            ipHash,
          },
        });
        const outcome = await maybePublishCorroborated(openProposal.id, settings);
        return NextResponse.json({
          ok: true,
          message:
            outcome === "published"
              ? "Thanks — enough members agree; the price has been updated."
              : outcome === "outdated"
                ? "Thanks — a newer price was posted in the meantime, so that pending report was archived. Submit again if the shelf price still differs."
                : outcome === "pending"
                  ? "Thanks — your report matches a pending one. It needs one more confirmation."
                  : "Thanks — that report was just resolved. Refresh to see the current price.",
        });
      }
      if (openProposal && openProposal.userId === user.id) {
        return NextResponse.json(
          { error: "You already proposed this price — it’s waiting for corroboration." },
          { status: 409 }
        );
      }

      const decision = decideDispute({
        userReputation: user.reputation,
        userCreatedAt: user.createdAt,
        proposedPriceCents: priceCents,
        currentPriceCents,
        settings,
      });

      const contribution = await prisma.contribution.create({
        data: {
          userId: user.id,
          storeId,
          productLineId,
          kind: "DISPUTE",
          ipHash,
          proposedPriceCents: priceCents,
          proposedQty,
          proposedStrength: body?.strength ? cleanText(body.strength, 60).trim() || null : null,
          proposedFlavor: body?.flavor ? cleanText(body.flavor, 80).trim() || null : null,
          comment: body?.comment ? cleanText(body.comment, 500) || null : null,
          status:
            decision.action === "AUTO_PUBLISH"
              ? "PENDING" // flipped by publishDispute
              : decision.action === "CORROBORATE"
                ? "CORROBORATING"
                : "PENDING",
        },
      });

      if (decision.action === "AUTO_PUBLISH") {
        const outcome = await publishDispute(contribution.id, "auto");
        return NextResponse.json({
          ok: true,
          message:
            outcome === "published"
              ? "Price updated — thanks! (You’re a trusted contributor.)"
              : "Thanks — a newer price observation arrived just before yours, so it wasn’t applied. Refresh to see the current price.",
        });
      }
      if (decision.action === "CORROBORATE") {
        return NextResponse.json({
          ok: true,
          message: `Thanks — your report is recorded. It will publish once ${settings.corroborationsRequired} independent member${settings.corroborationsRequired > 1 ? "s" : ""} report the same price (or a moderator approves it).`,
        });
      }
      return NextResponse.json({
        ok: true,
        message: "Thanks — that’s a big change, so a moderator will review it before it goes live.",
      });
    }

    return NextResponse.json({ error: "Unknown contribution kind." }, { status: 400 });
  } catch (e) {
    if (e instanceof AuthError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
