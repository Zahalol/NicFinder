// Periodic maintenance job — safe to run as often as hourly.
// Designed for Replit Scheduled Deployments (see REPLIT.md):
//   command: node scripts/maintenance.mjs
//
// What it does (all append-only/status changes, nothing deleted):
//   1. Marks ACTIVE quantity deals past their expiresAt as EXPIRED.
//   2. Reports data-freshness counts (for logs/alerting).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const now = new Date();

  const expired = await prisma.quantityDeal.updateMany({
    where: { status: "ACTIVE", expiresAt: { not: null, lt: now } },
    data: { status: "EXPIRED" },
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
