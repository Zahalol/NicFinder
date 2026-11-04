import { prisma } from "@/lib/db";

/** Wipe all data (order matters for FK constraints). */
export async function resetDb() {
  await prisma.$transaction([
    prisma.verification.deleteMany(),
    prisma.reputationEvent.deleteMany(),
    prisma.moderationAction.deleteMany(),
    prisma.auditEvent.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.priceObservation.deleteMany(),
    prisma.quantityDeal.deleteMany(),
    prisma.contribution.deleteMany(),
    prisma.importRow.deleteMany(),
    prisma.importBatch.deleteMany(),
    prisma.duplicateCandidate.deleteMany(),
    prisma.storeIdentity.deleteMany(),
    prisma.store.deleteMany(),
    prisma.authSession.deleteMany(),
    prisma.user.deleteMany(),
    prisma.productLine.deleteMany(),
    prisma.setting.deleteMany(),
    prisma.geocodeCache.deleteMany(),
  ]);
}

export async function seedProductLines() {
  const zyn = await prisma.productLine.create({
    data: { slug: "zyn", name: "ZYN (regular)", brand: "ZYN", sortOrder: 1 },
  });
  const ultra = await prisma.productLine.create({
    data: { slug: "zyn-ultra", name: "ZYN Ultra", brand: "ZYN", sortOrder: 2 },
  });
  return { zyn, ultra };
}

export async function makeUser(opts: {
  email: string;
  reputation?: number;
  role?: string;
  createdDaysAgo?: number;
}) {
  return prisma.user.create({
    data: {
      email: opts.email,
      displayName: opts.email.split("@")[0],
      reputation: opts.reputation ?? 0,
      role: opts.role ?? "USER",
      createdAt: new Date(Date.now() - (opts.createdDaysAgo ?? 30) * 86400_000),
    },
  });
}
