// In-app notifications. No email, no external sending — alerts live on the
// site only (header bell + account page) until an email provider is
// configured and authorized.

import { prisma } from "./db";
import { formatCents } from "./money";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient | typeof prisma;

/**
 * Notify everyone who saved this store that a price changed.
 *
 * Anti-pile-up rule: a user gets at most one UNREAD price notification per
 * store — later changes update that one (newest wins) instead of stacking
 * ten rows after a busy import day.
 */
export async function notifyPriceChange(
  opts: {
    storeId: string;
    storeName: string;
    productLineName: string;
    newPriceCents: number | null;
    previousPriceCents: number | null;
    /** actor to skip (don't notify the person who made the change) */
    actorUserId?: string | null;
  },
  tx: Tx = prisma
): Promise<number> {
  if (opts.newPriceCents === null) return 0;
  if (opts.previousPriceCents === opts.newPriceCents) return 0;

  const watchers = await tx.savedStore.findMany({
    where: { storeId: opts.storeId },
    select: { userId: true },
  });
  const userIds = watchers
    .map((w) => w.userId)
    .filter((id) => id !== opts.actorUserId);
  if (!userIds.length) return 0;

  const direction =
    opts.previousPriceCents === null
      ? "now"
      : opts.newPriceCents < opts.previousPriceCents
        ? "down to"
        : "up to";
  const title = `${opts.storeName}: ${opts.productLineName} ${direction} ${formatCents(opts.newPriceCents)}`;
  const body =
    opts.previousPriceCents !== null
      ? `Was ${formatCents(opts.previousPriceCents)}.`
      : "First reported price at this saved store.";
  const url = `/stores/${opts.storeId}`;

  let created = 0;
  for (const userId of userIds) {
    const existing = await tx.notification.findFirst({
      where: { userId, storeId: opts.storeId, kind: "PRICE_CHANGE", readAt: null },
      select: { id: true },
    });
    if (existing) {
      await tx.notification.update({
        where: { id: existing.id },
        data: { title, body, url, createdAt: new Date() },
      });
    } else {
      await tx.notification.create({
        data: { userId, kind: "PRICE_CHANGE", storeId: opts.storeId, title, body, url },
      });
      created++;
    }
  }
  return created;
}

/**
 * Tell a contributor their report was resolved. Unlike price-change alerts
 * these are NOT collapsed — each resolution is its own event.
 */
export async function notifyReportResolved(
  opts: {
    userId: string;
    storeId: string;
    storeName: string;
    /** e.g. "price report", "observation flag", "deal report" */
    what: string;
    outcome: "published" | "rejected" | "upheld" | "dismissed";
    note?: string | null;
  },
  tx: Tx = prisma
): Promise<void> {
  const verb =
    opts.outcome === "published"
      ? "was published"
      : opts.outcome === "upheld"
        ? "was upheld"
        : opts.outcome === "dismissed"
          ? "was dismissed"
          : "was not accepted";
  await tx.notification.create({
    data: {
      userId: opts.userId,
      kind: "REPORT_RESOLVED",
      storeId: opts.storeId,
      title: `Your ${opts.what} at ${opts.storeName} ${verb}`,
      body: opts.note ? `Moderator note: ${opts.note}` : null,
      url: `/stores/${opts.storeId}`,
    },
  });
}

/**
 * Close the coverage-demand loop: when a ZIP that people asked about gains
 * its FIRST priced store, tell each signed-in requester once.
 *
 * Call AFTER creating a priced observation. `zipHadPricedStoreBefore` is the
 * caller's pre-insert answer, so this function stays cheap and race-honest.
 */
export async function maybeNotifyCoverageArrived(
  opts: {
    zip: string | null;
    storeName: string;
    zipHadPricedStoreBefore: boolean;
  },
  tx: Tx = prisma
): Promise<number> {
  if (!opts.zip || opts.zipHadPricedStoreBefore) return 0;
  const requests = await tx.coverageRequest.findMany({
    where: { zip: opts.zip, userId: { not: null }, notifiedAt: null },
    select: { id: true, userId: true },
  });
  if (!requests.length) return 0;

  const seen = new Set<string>();
  let created = 0;
  for (const r of requests) {
    if (!r.userId || seen.has(r.userId)) continue;
    seen.add(r.userId);
    await tx.notification.create({
      data: {
        userId: r.userId,
        kind: "COVERAGE_ARRIVED",
        title: `Coverage arrived in ${opts.zip}`,
        body: `${opts.storeName} now has a reported price — you asked us to cover this area.`,
        url: `/zyn-prices/${opts.zip}`,
      },
    });
    created++;
  }
  await tx.coverageRequest.updateMany({
    where: { id: { in: requests.map((r) => r.id) } },
    data: { notifiedAt: new Date() },
  });
  return created;
}

/** Pre-insert check for maybeNotifyCoverageArrived. */
export async function zipHasPricedStore(
  zip: string | null,
  tx: Tx = prisma
): Promise<boolean> {
  if (!zip) return true; // unknown zip → never notify
  const existing = await tx.priceObservation.findFirst({
    where: {
      status: "ACTIVE",
      priceCents: { not: null },
      store: { status: "ACTIVE", zip },
    },
    select: { id: true },
  });
  return existing !== null;
}

export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markAllRead(userId: string): Promise<number> {
  const r = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return r.count;
}
