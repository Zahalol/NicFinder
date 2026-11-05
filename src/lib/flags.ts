// Historical-observation disputes ("flags").
//
// A DISPUTE proposes a replacement for the *current* price. A FLAG instead
// says a *specific* listed observation (current or historical) is wrong —
// bad import row, typo, fabricated report — without proposing a price.
// Flags never auto-publish: a moderator upholds (observation INVALIDATED,
// append-only, provenance kept) or dismisses them. Reputation follows the
// outcome so spam-flagging costs something.

import { prisma } from "./db";
import { addReputation } from "./reputation";
import { notifyReportResolved } from "./notifications";
import { audit } from "./audit";

export const FLAG_REP = {
  UPHELD: 3,
  DISMISSED: -2,
} as const;

export const FLAG_KIND = "FLAG_OBSERVATION";

export type FlagResult =
  | { ok: true; contributionId: string }
  | { ok: false; error: string; status: number };

export async function flagObservation(opts: {
  observationId: string;
  storeId: string;
  userId: string;
  reason: string;
}): Promise<FlagResult> {
  const reason = opts.reason.trim().slice(0, 500);
  if (reason.length < 5)
    return {
      ok: false,
      error: "Say briefly what’s wrong with this observation (5+ characters).",
      status: 400,
    };

  const obs = await prisma.priceObservation.findUnique({
    where: { id: opts.observationId },
  });
  if (!obs || obs.storeId !== opts.storeId)
    return { ok: false, error: "Observation not found.", status: 404 };
  if (obs.status === "INVALIDATED")
    return { ok: false, error: "This observation is already invalidated.", status: 409 };
  if (obs.status !== "ACTIVE" && obs.status !== "SUPERSEDED")
    return { ok: false, error: "This observation can’t be flagged.", status: 409 };

  // Flagging your own community report → retract it instead (not built; just block).
  if (obs.contributionId) {
    const origin = await prisma.contribution.findUnique({
      where: { id: obs.contributionId },
      select: { userId: true },
    });
    if (origin?.userId === opts.userId)
      return {
        ok: false,
        error: "This is your own report — ask a moderator to retract it.",
        status: 400,
      };
  }

  const existing = await prisma.contribution.findFirst({
    where: {
      kind: FLAG_KIND,
      targetObservationId: opts.observationId,
      userId: opts.userId,
      // Includes REJECTED: an observation is immutable, so re-flagging the
      // same one after a moderator dismissed your flag is pure spam.
      status: { in: ["PENDING", "PUBLISHED", "REJECTED"] },
    },
    select: { id: true },
  });
  if (existing)
    return { ok: false, error: "You already flagged this observation.", status: 409 };

  const contribution = await prisma.contribution.create({
    data: {
      userId: opts.userId,
      storeId: opts.storeId,
      productLineId: obs.productLineId,
      kind: FLAG_KIND,
      targetObservationId: opts.observationId,
      comment: reason,
      status: "PENDING",
    },
  });
  return { ok: true, contributionId: contribution.id };
}

export type ResolveResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

/** Moderator agrees: invalidate the observation (append-only), credit the flagger. */
export async function upholdFlag(
  contributionId: string,
  moderatorId: string,
  note?: string
): Promise<ResolveResult> {
  const c = await prisma.contribution.findUnique({ where: { id: contributionId } });
  if (!c || c.kind !== FLAG_KIND || c.status !== "PENDING" || !c.targetObservationId)
    return { ok: false, error: "Flag not reviewable.", status: 409 };

  await prisma.$transaction(async (tx) => {
    await tx.priceObservation.update({
      where: { id: c.targetObservationId! },
      data: {
        status: "INVALIDATED",
        invalidReason: `Flagged by community: ${c.comment ?? "no reason recorded"}${note ? ` — moderator: ${note}` : ""}`,
      },
    });
    await tx.contribution.update({
      where: { id: c.id },
      data: {
        status: "PUBLISHED",
        reviewedById: moderatorId,
        reviewNote: note || "Flag upheld",
        resolvedAt: new Date(),
      },
    });
    await addReputation(c.userId, FLAG_REP.UPHELD, "FLAG_UPHELD", {
      type: "contribution",
      id: c.id,
    }, tx);
    await tx.moderationAction.create({
      data: {
        actorId: moderatorId,
        action: "UPHOLD_FLAG",
        targetType: "contribution",
        targetId: c.id,
        reason: note || "Flag upheld",
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
        what: "observation flag",
        outcome: "upheld",
      },
      tx
    );
  });
  await audit("OBSERVATION_INVALIDATED", {
    userId: moderatorId,
    targetType: "observation",
    targetId: c.targetObservationId,
    detail: { via: "flag", contributionId: c.id },
  });
  return { ok: true };
}

/** Moderator disagrees: reject the flag; the observation stands untouched. */
export async function dismissFlag(
  contributionId: string,
  moderatorId: string,
  reason: string
): Promise<ResolveResult> {
  if (!reason.trim())
    return { ok: false, error: "A reason is required to dismiss a flag.", status: 400 };
  const c = await prisma.contribution.findUnique({ where: { id: contributionId } });
  if (!c || c.kind !== FLAG_KIND || c.status !== "PENDING")
    return { ok: false, error: "Flag not reviewable.", status: 409 };

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
    await addReputation(c.userId, FLAG_REP.DISMISSED, "FLAG_DISMISSED", {
      type: "contribution",
      id: c.id,
    }, tx);
    await tx.moderationAction.create({
      data: {
        actorId: moderatorId,
        action: "DISMISS_FLAG",
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
        what: "observation flag",
        outcome: "dismissed",
        note: reason.slice(0, 300),
      },
      tx
    );
  });
  return { ok: true };
}

// --- Deal flags -------------------------------------------------------------
// "This deal has ended / never existed." Same review-only model as
// observation flags; the deal id rides in targetObservationId (the generic
// target slot — corroboration CONFIRMs already store proposal ids there).

export const DEAL_FLAG_KIND = "FLAG_DEAL";

export async function flagDeal(opts: {
  dealId: string;
  storeId: string;
  userId: string;
  reason: string;
}): Promise<FlagResult> {
  const reason = opts.reason.trim().slice(0, 500);
  if (reason.length < 5)
    return {
      ok: false,
      error: "Say briefly what’s wrong with this deal (5+ characters).",
      status: 400,
    };
  const deal = await prisma.quantityDeal.findUnique({ where: { id: opts.dealId } });
  if (!deal || deal.storeId !== opts.storeId)
    return { ok: false, error: "Deal not found.", status: 404 };
  if (deal.status !== "ACTIVE")
    return { ok: false, error: "This deal is no longer active.", status: 409 };

  const existing = await prisma.contribution.findFirst({
    where: {
      kind: DEAL_FLAG_KIND,
      targetObservationId: opts.dealId,
      userId: opts.userId,
      status: { in: ["PENDING", "PUBLISHED", "REJECTED"] },
    },
    select: { id: true },
  });
  if (existing)
    return { ok: false, error: "You already flagged this deal.", status: 409 };

  const contribution = await prisma.contribution.create({
    data: {
      userId: opts.userId,
      storeId: opts.storeId,
      productLineId: deal.productLineId,
      kind: DEAL_FLAG_KIND,
      targetObservationId: opts.dealId,
      comment: reason,
      status: "PENDING",
    },
  });
  return { ok: true, contributionId: contribution.id };
}

/**
 * Moderator agrees the deal is gone/wrong. `how`: "ended" marks it EXPIRED
 * (it existed, it's over); "invalid" marks it INVALIDATED (bad data).
 */
export async function upholdDealFlag(
  contributionId: string,
  moderatorId: string,
  how: "ended" | "invalid",
  note?: string
): Promise<ResolveResult> {
  const c = await prisma.contribution.findUnique({ where: { id: contributionId } });
  if (!c || c.kind !== DEAL_FLAG_KIND || c.status !== "PENDING" || !c.targetObservationId)
    return { ok: false, error: "Deal flag not reviewable.", status: 409 };

  await prisma.$transaction(async (tx) => {
    await tx.quantityDeal.update({
      where: { id: c.targetObservationId! },
      data: { status: how === "ended" ? "EXPIRED" : "INVALIDATED" },
    });
    await tx.contribution.update({
      where: { id: c.id },
      data: {
        status: "PUBLISHED",
        reviewedById: moderatorId,
        reviewNote: note || `Deal ${how === "ended" ? "marked ended" : "invalidated"}`,
        resolvedAt: new Date(),
      },
    });
    await addReputation(c.userId, FLAG_REP.UPHELD, "DEAL_FLAG_UPHELD", {
      type: "contribution",
      id: c.id,
    }, tx);
    await tx.moderationAction.create({
      data: {
        actorId: moderatorId,
        action: "UPHOLD_DEAL_FLAG",
        targetType: "contribution",
        targetId: c.id,
        reason: note || how,
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
        what: "deal flag",
        outcome: "upheld",
      },
      tx
    );
  });
  return { ok: true };
}

export async function dismissDealFlag(
  contributionId: string,
  moderatorId: string,
  reason: string
): Promise<ResolveResult> {
  if (!reason.trim())
    return { ok: false, error: "A reason is required to dismiss a flag.", status: 400 };
  const c = await prisma.contribution.findUnique({ where: { id: contributionId } });
  if (!c || c.kind !== DEAL_FLAG_KIND || c.status !== "PENDING")
    return { ok: false, error: "Deal flag not reviewable.", status: 409 };
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
    await addReputation(c.userId, FLAG_REP.DISMISSED, "DEAL_FLAG_DISMISSED", {
      type: "contribution",
      id: c.id,
    }, tx);
    await tx.moderationAction.create({
      data: {
        actorId: moderatorId,
        action: "DISMISS_DEAL_FLAG",
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
        what: "deal flag",
        outcome: "dismissed",
        note: reason.slice(0, 300),
      },
      tx
    );
  });
  return { ok: true };
}
