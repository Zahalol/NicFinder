// Periodic maintenance job — safe to run as often as hourly.
// Designed for Replit Scheduled Deployments (see docs/REPLIT.md):
//   command: node scripts/maintenance.mjs
//
// What it does (price evidence is never deleted — only status changes):
//   1. Marks ACTIVE quantity deals past their expiresAt as EXPIRED.
//   2. Prunes rate-limit events older than a day (operational ephemera,
//      not evidence; used by the RATE_LIMIT_BACKEND=db limiter).
//   3. Reports data-freshness counts (for logs/alerting).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const now = new Date();

  const expired = await prisma.quantityDeal.updateMany({
    where: { status: "ACTIVE", expiresAt: { not: null, lt: now } },
    data: { status: "EXPIRED" },
  });

  // Prune short-lived rate-limit events (db backend); windows are minutes-
  // to-hours, so a day of retention is generous.
  const prunedRateLimitEvents = await prisma.rateLimitEvent.deleteMany({
    where: { createdAt: { lt: new Date(now.getTime() - 86400_000) } },
  });

  // Prune READ in-app notifications after 90 days (unread ones stay until
  // seen). Operational convenience data, not price evidence.
  const prunedNotifications = await prisma.notification.deleteMany({
    where: {
      readAt: { not: null, lt: new Date(now.getTime() - 90 * 86400_000) },
    },
  });

  const staleCutoff = new Date(now.getTime() - 21 * 86400_000);
  const [activeObs, staleObs, openReviews, coverageRequests] = await Promise.all([
    prisma.priceObservation.count({ where: { status: "ACTIVE" } }),
    prisma.priceObservation.count({
      where: { status: "ACTIVE", observedAt: { lt: staleCutoff } },
    }),
    prisma.contribution.count({ where: { status: { in: ["PENDING", "CORROBORATING"] } } }),
    prisma.coverageRequest.count(),
  ]);

  console.log(
    JSON.stringify({
      ranAt: now.toISOString(),
      dealsExpired: expired.count,
      prunedRateLimitEvents: prunedRateLimitEvents.count,
      prunedNotifications: prunedNotifications.count,
      activeObservations: activeObs,
      staleObservations: staleObs,
      openReviewItems: openReviews,
      coverageRequests,
    })
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
