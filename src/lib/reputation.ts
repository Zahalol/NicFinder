// Community reputation & publication engine.
// Full rules and rationale: docs/COMMUNITY_REPUTATION.md. All thresholds come
// from settings (admin-configurable in one place).
//
// Flow for a DISPUTE (replacement price):
//   1. Hard guardrails (sanity bounds, product match) — violations go to
//      review (PENDING), never auto-publish.
//   2. Trusted users (reputation >= trustedReputation) auto-publish IF the
//      change is within maxTrustedPriceChangeRatio of the current price.
//   3. Everyone else lands in CORROBORATING: the proposal publishes once
//      `corroborationsRequired` *independent* users confirm it.
// Flow for a CONFIRM: recorded as a Verification on the current observation
//   (one per user per observation, cooldown via observation lineage).
//
// Reputation deltas (recorded as ReputationEvent, summed into User.reputation):
//   +5  replacement corroborated/published and not later reversed
//   +2  confirmation of an observation that remains accurate
//   -3  confirmation of an observation that is later disproved (stale confirm)
//   -8  replacement rejected by moderation or disproved quickly
//   -15 abuse penalty (admin)
// Confirmations/contributions only earn reputation when the observation is
// fresh — confirming expired data earns nothing.

import { prisma } from "./db";
import type { AppSettings } from "./settings";
import { audit } from "./audit";
import type { Prisma } from "@prisma/client";

export const REP_DELTAS = {
  REPLACEMENT_PUBLISHED: 5,
  CONFIRM_ACCURATE: 2,
  CONFIRM_INACCURATE: -3,
  REPLACEMENT_REJECTED: -8,
  ABUSE_PENALTY: -15,
} as const;

export async function addReputation(
  userId: string,
  delta: number,
  reason: string,
  ref?: { type: string; id: string },
  tx: Prisma.TransactionClient | typeof prisma = prisma
): Promise<void> {
  await tx.reputationEvent.create({
    data: { userId, delta, reason, refType: ref?.type, refId: ref?.id },
  });
  await tx.user.update({
    where: { id: userId },
    data: { reputation: { increment: delta } },
  });
}

export interface DisputeDecision {
  action: "AUTO_PUBLISH" | "CORROBORATE" | "REVIEW";
  reason: string;
}

/**
 * Decide what happens to a proposed replacement price.
 * Pure function — unit tested in tests/reputation.test.ts.
 */
export function decideDispute(opts: {
  userReputation: number;
  userCreatedAt: Date;
  proposedPriceCents: number;
  currentPriceCents: number | null;
  settings: AppSettings;
  now?: Date;
}): DisputeDecision {
  const { settings } = opts;

  // Hard guardrails first — these never auto-publish.
  if (
    opts.proposedPriceCents < settings.priceSanityMinCents ||
    opts.proposedPriceCents > settings.priceSanityMaxCents
  ) {
    return {
      action: "REVIEW",
      reason: `Price outside sanity bounds (${settings.priceSanityMinCents}–${settings.priceSanityMaxCents} cents)`,
    };
  }

  const drastic =
    opts.currentPriceCents !== null &&
    Math.abs(opts.proposedPriceCents - opts.currentPriceCents) >
      opts.currentPriceCents * settings.maxTrustedPriceChangeRatio;

  if (drastic) {
    return {
      action: "REVIEW",
      reason: "Change exceeds the configured max ratio — needs review",
    };
  }

  const accountAgeDays =
    ((opts.now ?? new Date()).getTime() - opts.userCreatedAt.getTime()) /
    86400_000;

  if (opts.userReputation >= settings.trustedReputation && accountAgeDays >= 7) {
    return { action: "AUTO_PUBLISH", reason: "Trusted contributor within guardrails" };
  }

  return {
    action: "CORROBORATE",
    reason: `Needs ${settings.corroborationsRequired} independent confirmations`,
  };
}

/** Decayed weight of a confirmation given its age. */
export function confirmationWeight(
  createdAt: Date,
  halfLifeDays: number,
  now: Date = new Date()
): number {
  const ageDays = Math.max(0, (now.getTime() - createdAt.getTime()) / 86400_000);
  return Math.pow(0.5, ageDays / halfLifeDays);
}

/**
 * How a publish attempt ended:
 *  - "published": the price went live.
 *  - "already-resolved": another request published/rejected it first.
 *  - "outdated": a newer observation arrived since the proposal was opened;
 *    it was resolved REJECTED without publishing.
 *  - "pending" (corroboration only): threshold not reached yet.
 */
export type PublishOutcome = "published" | "already-resolved" | "outdated";

/**
 * Count independent corroborations for a CORROBORATING contribution and
 * publish it when the threshold is met. "Independent": distinct users other
 * than the proposer.
 */
export async function maybePublishCorroborated(
  contributionId: string,
  settings: AppSettings
): Promise<PublishOutcome | "pending"> {
  const contribution = await prisma.contribution.findUnique({
    where: { id: contributionId },
  });
  if (!contribution || contribution.status !== "CORROBORATING")
    return "already-resolved";

  // Corroborations are CONFIRM contributions that target this proposal.
  const corroborators = await prisma.contribution.findMany({
    where: {
      kind: "CONFIRM",
      targetObservationId: contribution.id, // proposals are confirmed by id-reference
      status: "PUBLISHED",
      userId: { not: contribution.userId },
    },
    select: { userId: true },
    distinct: ["userId"],
  });

  if (corroborators.length < settings.corroborationsRequired) return "pending";

  return publishDispute(contribution.id, "corroborated");
}

/**
 * Publish a dispute: supersede the current ACTIVE observation for that
 * store+product and create the new COMMUNITY observation.
 *
 * Concurrency-safe: the contribution row is atomically claimed
 * (PENDING/CORROBORATING → PUBLISHED) inside the transaction. If another
 * request already resolved it, this returns "already-resolved" and changes
 * nothing — concurrent corroborations cannot double-publish or double-award
 * reputation.
 */
export async function publishDispute(
  contributionId: string,
  how: "auto" | "corroborated" | "moderator",
  moderatorId?: string
): Promise<PublishOutcome> {
  const outcome = await prisma.$transaction<PublishOutcome>(async (tx) => {
    const c = await tx.contribution.findUniqueOrThrow({
      where: { id: contributionId },
    });
    if (c.proposedPriceCents === null) throw new Error("No proposed price");

    // Atomic claim: only one caller can move the row out of a publishable
    // state. Concurrent callers block on the row lock, then match 0 rows.
    const claimed = await tx.contribution.updateMany({
      where: {
        id: contributionId,
        status: { in: ["PENDING", "CORROBORATING"] },
      },
      data: {
        status: "PUBLISHED",
        resolvedAt: new Date(),
        reviewedById: moderatorId,
      },
    });
    if (claimed.count === 0) return "already-resolved";

    const superseded = await tx.priceObservation.findMany({
      where: {
        storeId: c.storeId,
        productLineId: c.productLineId,
        status: "ACTIVE",
      },
      include: { verifications: true },
    });

    // Staleness guard: a proposal observes the price AT ITS CREATION TIME.
    // If a newer observation has arrived since (fresh import, admin entry,
    // another community price), publishing would supersede newer evidence
    // with older — refuse and resolve the proposal as outdated instead.
    const newest = superseded.reduce(
      (max, o) => Math.max(max, o.observedAt.getTime()),
      0
    );
    if (newest > c.createdAt.getTime()) {
      await tx.contribution.update({
        where: { id: c.id },
        data: {
          status: "REJECTED",
          reviewNote: "Outdated: a newer price observation arrived before this proposal was confirmed.",
          reviewedById: moderatorId,
        },
      });
      return "outdated";
    }
    await tx.priceObservation.updateMany({
      where: {
        storeId: c.storeId,
        productLineId: c.productLineId,
        status: "ACTIVE",
      },
      data: { status: "SUPERSEDED" },
    });

    // Eventual accuracy: users who confirmed the now-replaced price *recently*
    // (it was already wrong when they confirmed, assuming the replacement is
    // right) lose reputation — only when the price actually changed.
    const recentCutoff = Date.now() - 7 * 86400_000;
    for (const obs of superseded) {
      if (obs.priceCents === c.proposedPriceCents) continue;
      for (const v of obs.verifications) {
        if (v.verdict === "CONFIRM" && v.createdAt.getTime() >= recentCutoff && v.userId !== c.userId) {
          await addReputation(
            v.userId,
            REP_DELTAS.CONFIRM_INACCURATE,
            "CONFIRM_INACCURATE",
            { type: "verification", id: v.id },
            tx
          );
        }
      }
    }

    await tx.priceObservation.create({
      data: {
        storeId: c.storeId,
        productLineId: c.productLineId,
        priceCents: c.proposedPriceCents,
        observedAt: c.createdAt,
        sourceType: "COMMUNITY",
        contributionId: c.id,
        status: "ACTIVE",
        notes: how === "moderator" ? "Published by moderator" : undefined,
      },
    });

    await addReputation(
      c.userId,
      REP_DELTAS.REPLACEMENT_PUBLISHED,
      "CONTRIBUTION_PUBLISHED",
      { type: "contribution", id: c.id },
      tx
    );
    return "published";
  });
  if (outcome === "published") {
    await audit("PRICE_PUBLISHED", {
      targetType: "contribution",
      targetId: contributionId,
      detail: { how },
      userId: moderatorId ?? null,
    });
  }
  return outcome;
}
