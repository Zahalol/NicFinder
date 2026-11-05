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
import {
  notifyPriceChange,
  notifyReportResolved,
  maybeNotifyCoverageArrived,
  zipHasPricedStore,
} from "./notifications";
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
 * Count independent corroborations for a CORROBORATING contribution and
 * publish it when the threshold is met. "Independent": distinct users other
 * than the proposer. Returns true if published.
 */
export async function maybePublishCorroborated(
  contributionId: string,
  settings: AppSettings
): Promise<boolean> {
  const contribution = await prisma.contribution.findUnique({
    where: { id: contributionId },
  });
  if (!contribution || contribution.status !== "CORROBORATING") return false;

  // Corroborations are CONFIRM contributions that target this proposal.
  const corroborators = await prisma.contribution.findMany({
    where: {
      kind: "CONFIRM",
      targetObservationId: contribution.id, // proposals are confirmed by id-reference
      status: "PUBLISHED",
      userId: { not: contribution.userId },
    },
    select: { userId: true, ipHash: true },
    distinct: ["userId"],
  });

  // Independence is distinct ACCOUNTS on distinct NETWORKS: two accounts
  // corroborating from the same salted IP hash count once, and none of them
  // may share the proposer's hash (sockpuppet guard). A null hash (unknown
  // origin, e.g. legacy rows) still counts — this tightens, never bricks.
  const seenHashes = new Set<string>();
  if (contribution.ipHash) seenHashes.add(contribution.ipHash);
  let independent = 0;
  for (const c of corroborators) {
    if (c.ipHash === null) {
      independent++;
      continue;
    }
    if (seenHashes.has(c.ipHash)) continue;
    seenHashes.add(c.ipHash);
    independent++;
  }

  if (independent < settings.corroborationsRequired) return false;

  await publishDispute(contribution.id, "corroborated");
  return true;
}

/**
 * Publish a dispute: supersede the current ACTIVE observation for that
 * store+product and create the new COMMUNITY observation.
 */
export async function publishDispute(
  contributionId: string,
  how: "auto" | "corroborated" | "moderator",
  moderatorId?: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const c = await tx.contribution.findUniqueOrThrow({
      where: { id: contributionId },
    });
    if (c.proposedPriceCents === null) throw new Error("No proposed price");

    const storeForZip = await tx.store.findUnique({
      where: { id: c.storeId },
      select: { zip: true, name: true },
    });
    // Must be answered BEFORE superseding/creating anything in this tx.
    const zipHadPricedStoreBefore = await zipHasPricedStore(storeForZip?.zip ?? null, tx);

    const superseded = await tx.priceObservation.findMany({
      where: {
        storeId: c.storeId,
        productLineId: c.productLineId,
        status: "ACTIVE",
      },
      include: { verifications: true },
    });
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

    await tx.contribution.update({
      where: { id: c.id },
      data: {
        status: "PUBLISHED",
        resolvedAt: new Date(),
        reviewedById: moderatorId,
      },
    });

    // Alert members who saved this store (in-app only; actor excluded).
    const prevPriced = superseded
      .filter((o) => o.priceCents !== null)
      .sort((a, b) => b.observedAt.getTime() - a.observedAt.getTime())[0];
    const [storeRow, lineRow] = await Promise.all([
      tx.store.findUnique({ where: { id: c.storeId }, select: { name: true } }),
      tx.productLine.findUnique({ where: { id: c.productLineId }, select: { name: true } }),
    ]);
    await notifyPriceChange(
      {
        storeId: c.storeId,
        storeName: storeRow?.name ?? "A saved store",
        productLineName: lineRow?.name ?? "price",
        newPriceCents: c.proposedPriceCents,
        previousPriceCents: prevPriced?.priceCents ?? null,
        actorUserId: c.userId,
      },
      tx
    );

    await maybeNotifyCoverageArrived(
      {
        zip: storeForZip?.zip ?? null,
        storeName: storeForZip?.name ?? "A store",
        zipHadPricedStoreBefore,
      },
      tx
    );

    await addReputation(
      c.userId,
      REP_DELTAS.REPLACEMENT_PUBLISHED,
      "CONTRIBUTION_PUBLISHED",
      { type: "contribution", id: c.id },
      tx
    );

    // Close the loop with the reporter — except for trusted auto-publishes,
    // where they just saw it happen in the response.
    if (how !== "auto") {
      await notifyReportResolved(
        {
          userId: c.userId,
          storeId: c.storeId,
          storeName: storeRow?.name ?? "a store",
          what: "price report",
          outcome: "published",
        },
        tx
      );
    }
  });
  await audit("PRICE_PUBLISHED", {
    targetType: "contribution",
    targetId: contributionId,
    detail: { how },
    userId: moderatorId ?? null,
  });
}
