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
