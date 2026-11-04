import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { parsePriceToCents } from "@/lib/money";
import { countRecentContributions } from "@/lib/rate-limit";
import { parseOptionalQty } from "@/lib/validate";
import { selectLatestPrice } from "@/lib/prices";
import {
  decideDispute,
  publishDispute,
  maybePublishCorroborated,
  addReputation,
  REP_DELTAS,
} from "@/lib/reputation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id: storeId } = await params;
    const settings = await getSettings();

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
      return NextResponse.json({ ok: true, message: "Thanks — confirmation recorded." });
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
        await prisma.contribution.create({
          data: {
            userId: user.id,
            storeId,
            productLineId,
            kind: "CONFIRM",
            targetObservationId: openProposal.id, // references the proposal
            status: "PUBLISHED",
            resolvedAt: new Date(),
            comment: body?.comment ? String(body.comment).slice(0, 500) : null,
          },
        });
        const published = await maybePublishCorroborated(openProposal.id, settings);
        return NextResponse.json({
          ok: true,
          message: published
            ? "Thanks — enough members agree; the price has been updated."
            : "Thanks — your report matches a pending one. It needs one more confirmation.",
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
          proposedPriceCents: priceCents,
          proposedQty,
          comment: body?.comment ? String(body.comment).slice(0, 500) : null,
          status:
            decision.action === "AUTO_PUBLISH"
              ? "PENDING" // flipped by publishDispute
              : decision.action === "CORROBORATE"
                ? "CORROBORATING"
                : "PENDING",
        },
      });

      if (decision.action === "AUTO_PUBLISH") {
        await publishDispute(contribution.id, "auto");
        return NextResponse.json({
          ok: true,
          message: "Price updated — thanks! (You’re a trusted contributor.)",
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
