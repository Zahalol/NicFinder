// Periodic maintenance job — safe to run as often as hourly.
// Designed for Replit Scheduled Deployments (see docs/REPLIT.md):
//   command: node scripts/maintenance.mjs
//
// What it does:
//   1. Marks ACTIVE quantity deals past their expiresAt as EXPIRED.
//   2. Deletes expired auth sessions (they are dead credentials, not
//      evidence — leaving them accumulates rows forever; getUserByToken
//      also rejects them individually, this is the bulk cleanup).
//   3. Reconciles cached User.reputation against the ReputationEvent ledger
//      (the sum is the source of truth; drift is corrected and reported).
//   4. Reports data-freshness counts (for logs/alerting).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const now = new Date();

  const expired = await prisma.quantityDeal.updateMany({
    where: { status: "ACTIVE", expiresAt: { not: null, lt: now } },
    data: { status: "EXPIRED" },
  });

  const purgedSessions = await prisma.authSession.deleteMany({
    where: { expiresAt: { lt: now } },
  });

  // Reputation reconciliation: User.reputation is a cached sum of the
  // append-only ReputationEvent ledger. Fix any drift (bugs, manual DB
  // edits) and report it — repeated drift would indicate a code path that
  // updates one side without the other.
  const ledger = await prisma.reputationEvent.groupBy({
    by: ["userId"],
    _sum: { delta: true },
  });
  const ledgerByUser = new Map(ledger.map((l) => [l.userId, l._sum.delta ?? 0]));
  const users = await prisma.user.findMany({ select: { id: true, reputation: true } });
  let reputationDriftFixed = 0;
  let reputationUnledgered = 0;
  for (const u of users) {
    if (!ledgerByUser.has(u.id)) {
      // No ledger events at all (e.g. pre-ledger seeded baselines): report,
      // never overwrite — zeroing these would destroy legitimate grants.
      if (u.reputation !== 0) reputationUnledgered++;
      continue;
    }
    const expected = ledgerByUser.get(u.id) ?? 0;
    if (u.reputation !== expected) {
      await prisma.user.update({ where: { id: u.id }, data: { reputation: expected } });
      reputationDriftFixed++;
      console.error(
        `reputation drift: user ${u.id} cached=${u.reputation} ledger=${expected} (fixed)`
      );
    }
  }

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
      sessionsPurged: purgedSessions.count,
      reputationDriftFixed,
      reputationUnledgered,
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
