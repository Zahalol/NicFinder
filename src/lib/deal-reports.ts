// Community multi-can deal reports ("buy 5, $1 off each").
//
// Deals are structurally richer than a single price (min qty, price vs
// discount, conditions), so community reports always go to moderator review
// rather than auto-publishing or corroborating. Approval creates a
// COMMUNITY-sourced QuantityDeal via the same model imports use.

import { prisma } from "./db";
import { parsePriceToCents } from "./money";
import { addReputation } from "./reputation";
import { notifyReportResolved } from "./notifications";
import { audit } from "./audit";

export const DEAL_KIND = "REPORT_DEAL";
export const DEAL_REP = { PUBLISHED: 4, REJECTED: -2 } as const;

export interface DealProposal {
  minQty: number;
  pricePerCanCents: number | null;
  discountPerCanCents: number | null;
  conditions: string | null;
}

export type DealReportResult =
  | { ok: true; contributionId: string }
  | { ok: false; error: string; status: number };

export async function reportDeal(opts: {
  storeId: string;
  productLineId: string;
  userId: string;
  minQty: unknown;
  dealPrice: unknown; // per-can price at qty
  dealDiscount: unknown; // per-can discount
  conditions?: unknown;
}): Promise<DealReportResult> {
  const minQty = Number(opts.minQty);
  if (!Number.isInteger(minQty) || minQty < 2 || minQty > 100)
    return { ok: false, error: "Deal quantity must be a whole number of 2 or more.", status: 400 };

  const priceCents = parsePriceToCents(opts.dealPrice);
  const discountCents = parsePriceToCents(opts.dealDiscount);
  if (priceCents === null && discountCents === null)
    return {
      ok: false,
      error: "Give either the per-can deal price or the per-can discount.",
      status: 400,
    };
  if (priceCents !== null && discountCents !== null)
    return {
      ok: false,
      error: "Give the deal price or the discount — not both.",
      status: 400,
    };
  if (priceCents !== null && (priceCents < 100 || priceCents > 2500))
    return { ok: false, error: "Deal price looks implausible ($1–$25 per can).", status: 400 };
  if (discountCents !== null && (discountCents < 5 || discountCents > 1000))
    return { ok: false, error: "Discount looks implausible ($0.05–$10 per can).", status: 400 };

  const conditions = opts.conditions
    ? String(opts.conditions).trim().slice(0, 300) || null
    : null;

  // One open deal report per user per store+line.
  const open = await prisma.contribution.findFirst({
    where: {
      userId: opts.userId,
      storeId: opts.storeId,
      productLineId: opts.productLineId,
      kind: DEAL_KIND,
      status: "PENDING",
    },
    select: { id: true },
  });
  if (open)
    return {
      ok: false,
      error: "You already have a deal report waiting for review here.",
      status: 409,
    };

  const proposal: DealProposal = {
    minQty,
    pricePerCanCents: priceCents,
    discountPerCanCents: discountCents,
    conditions,
  };
  const contribution = await prisma.contribution.create({
    data: {
      userId: opts.userId,
      storeId: opts.storeId,
      productLineId: opts.productLineId,
      kind: DEAL_KIND,
      proposedDealJson: JSON.stringify(proposal),
      proposedQty: minQty,
      comment: conditions,
      status: "PENDING",
    },
  });
  return { ok: true, contributionId: contribution.id };
}

export type PublishDealResult =
  | { ok: true; dealId: string }
  | { ok: false; error: string; status: number };

/** Moderator approves: create the COMMUNITY QuantityDeal. */
export async function publishDealReport(
  contributionId: string,
  moderatorId: string
): Promise<PublishDealResult> {
  const c = await prisma.contribution.findUnique({ where: { id: contributionId } });
  if (!c || c.kind !== DEAL_KIND || c.status !== "PENDING" || !c.proposedDealJson)
    return { ok: false, error: "Deal report not reviewable.", status: 409 };
  const proposal = JSON.parse(c.proposedDealJson) as DealProposal;

  let dealId = "";
  await prisma.$transaction(async (tx) => {
    // The new deal replaces any ACTIVE community/import deal for the same
    // store+line scope at the same minQty (append-only: supersede, not delete).
    await tx.quantityDeal.updateMany({
      where: {
        storeId: c.storeId,
        productLineId: c.productLineId,
        minQty: proposal.minQty,
        status: "ACTIVE",
      },
      data: { status: "SUPERSEDED" },
    });
    const deal = await tx.quantityDeal.create({
      data: {
        storeId: c.storeId,
        productLineId: c.productLineId,
        minQty: proposal.minQty,
        pricePerCanCents: proposal.pricePerCanCents,
        discountPerCanCents: proposal.discountPerCanCents,
        appliesAboveMinQty: null, // unknown unless stated — never extrapolated
        conditions: proposal.conditions,
        observedAt: c.createdAt,
        sourceType: "COMMUNITY",
        status: "ACTIVE",
      },
    });
    dealId = deal.id;
    await tx.contribution.update({
      where: { id: c.id },
      data: { status: "PUBLISHED", reviewedById: moderatorId, resolvedAt: new Date() },
    });
    await addReputation(c.userId, DEAL_REP.PUBLISHED, "DEAL_PUBLISHED", {
      type: "contribution",
      id: c.id,
    }, tx);
    await tx.moderationAction.create({
      data: {
        actorId: moderatorId,
        action: "APPROVE_DEAL",
        targetType: "contribution",
        targetId: c.id,
        reason: "Deal report approved",
      },
    });
    const storeRow = await tx.store.findUnique({
      where: { id: c.storeId },
      select: { name: true },
    });
    await notifyReportResolved(
      {
        userId: c.userId,
        storeId: c.storeId,
        storeName: storeRow?.name ?? "a store",
        what: "deal report",
        outcome: "published",
      },
      tx
    );
  });
  await audit("DEAL_PUBLISHED", {
    userId: moderatorId,
    targetType: "contribution",
    targetId: contributionId,
  });
  return { ok: true, dealId };
}

/** Moderator rejects a deal report (small reputation cost, reason required). */
export async function rejectDealReport(
  contributionId: string,
  moderatorId: string,
  reason: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!reason.trim())
    return { ok: false, error: "A reason is required.", status: 400 };
  const c = await prisma.contribution.findUnique({ where: { id: contributionId } });
  if (!c || c.kind !== DEAL_KIND || c.status !== "PENDING")
    return { ok: false, error: "Deal report not reviewable.", status: 409 };
  await prisma.$transaction(async (tx) => {
    await tx.contribution.update({
      where: { id: c.id },
      data: {
        status: "REJECTED",
        reviewedById: moderatorId,
        reviewNote: reason.slice(0, 300),
        resolvedAt: new Date(),
      },
    });
    await addReputation(c.userId, DEAL_REP.REJECTED, "DEAL_REJECTED", {
      type: "contribution",
      id: c.id,
    }, tx);
    await tx.moderationAction.create({
      data: {
        actorId: moderatorId,
        action: "REJECT_DEAL",
        targetType: "contribution",
        targetId: c.id,
        reason: reason.slice(0, 300),
      },
    });
    const storeRow = await tx.store.findUnique({
      where: { id: c.storeId },
      select: { name: true },
    });
    await notifyReportResolved(
      {
        userId: c.userId,
        storeId: c.storeId,
        storeName: storeRow?.name ?? "a store",
        what: "deal report",
        outcome: "rejected",
        note: reason.slice(0, 300),
      },
      tx
    );
  });
  return { ok: true };
}
