// Seed: product lines, users, the sanitized real Chicago store directory
// (NO prices — the old workbook is not evidence of current prices), and
// clearly fictional demo stores carrying synthetic demonstration prices.

import { PrismaClient } from "@prisma/client";
import { randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";

const prisma = new PrismaClient();
const scrypt = promisify(scryptCb);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

function normalizeAddressSeed(s: string): string {
  const abbrev: Record<string, string> = {
    street: "st", avenue: "ave", boulevard: "blvd", drive: "dr", parkway: "pkwy",
    road: "rd", lane: "ln", court: "ct", place: "pl", north: "n", south: "s",
    east: "e", west: "w",
  };
  return s.toLowerCase().replace(/[.,#]/g, " ").replace(/\s+/g, " ").trim()
    .split(" ").map((w) => abbrev[w] ?? w).join(" ");
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000);

// Sanitized directory from the exploratory workbook (deduplicated).
// These are REAL locations with public directory info; they carry NO price
// observations — the UI shows them as "no price reported yet".
const REAL_STORES: Array<{
  name: string; street: string; zip: string; phone: string; lat: number; lng: number;
}> = [
  { name: "Shell", street: "1160 W Diversey Pkwy", zip: "60614", phone: "+17739357042", lat: 41.9327565, lng: -87.6583238 },
  { name: "bp", street: "1355 W Diversey Pkwy", zip: "60614", phone: "+17734724370", lat: 41.932328, lng: -87.663263 },
  { name: "bp", street: "1647 N La Salle Dr", zip: "60614", phone: "+13129449654", lat: 41.912348, lng: -87.632671 },
  { name: "bp", street: "1607 W Fullerton Ave", zip: "60614", phone: "+17735259697", lat: 41.924856, lng: -87.668548 },
  { name: "Shell / Circle K", street: "801 W Addison St", zip: "60613", phone: "+17732960117", lat: 41.947112, lng: -87.649821 },
  { name: "bp", street: "1600 N Elston Ave", zip: "60622", phone: "+17732761133", lat: 41.911005, lng: -87.662908 },
  { name: "bp", street: "841 W Irving Park Rd", zip: "60613", phone: "+17734778328", lat: 41.95427, lng: -87.650898 },
  { name: "Shell", street: "1768 W Armitage Ave", zip: "60622", phone: "+17732351550", lat: 41.918121, lng: -87.6723769 },
  { name: "Mobil (Milito's)", street: "1106 W Fullerton Ave", zip: "60614", phone: "+17732480414", lat: 41.9255092, lng: -87.656387 },
  { name: "Shell", street: "130 W North Ave", zip: "60610", phone: "+13125339650", lat: 41.911333, lng: -87.6327905 },
  { name: "Shell", street: "2801 N Ashland Ave", zip: "60657", phone: "+17735252408", lat: 41.932626, lng: -87.668032 },
  { name: "Mobil", street: "1234 N Halsted St", zip: "60622", phone: "+13126646512", lat: 41.9045495, lng: -87.6485252 },
  { name: "bp", street: "1334 W Division St", zip: "60622", phone: "+17737729647", lat: 41.9036627, lng: -87.6620806 },
  { name: "Shell", street: "3600 N Ashland Ave", zip: "60613", phone: "+17733483442", lat: 41.947231, lng: -87.66919 },
  { name: "Mobil", street: "2801 N Damen Ave", zip: "60618", phone: "+17735280461", lat: 41.9326535, lng: -87.6779542 },
  { name: "Exxon", street: "2366 N Damen Ave", zip: "60647", phone: "+19728287250", lat: 41.9247574, lng: -87.678161 },
  { name: "Speedway", street: "3354 N Damen Ave", zip: "60618", phone: "+17734049404", lat: 41.9429306, lng: -87.6786479 },
  { name: "Shell", street: "3001 W Belmont Ave", zip: "60618", phone: "+17735399474", lat: 41.939201, lng: -87.703085 },
  { name: "Shell", street: "4000 N Clark St", zip: "60613", phone: "+17733608602", lat: 41.95453, lng: -87.66263 },
  { name: "bp", street: "3142 W North Ave", zip: "60647", phone: "+18478777511", lat: 41.9103388, lng: -87.7062956 },
  { name: "Speedway", street: "3554 W North Ave", zip: "60647", phone: "+17732763786", lat: 41.9104073, lng: -87.7163953 },
  { name: "Exxon", street: "3159 N Clybourn Ave", zip: "60618", phone: "+19728287250", lat: 41.939212, lng: -87.6872841 },
  { name: "bp", street: "1950 N California Ave", zip: "60647", phone: "+18473612659", lat: 41.917219, lng: -87.6974217 },
  { name: "bp", street: "3955 N Western Ave", zip: "60618", phone: "+17735395959", lat: 41.9537235, lng: -87.6880879 },
  { name: "bp", street: "755 W Lawrence Ave", zip: "60640", phone: "+17732717505", lat: 41.968755, lng: -87.649859 },
  { name: "Circle K", street: "3180 N Broadway", zip: "60657", phone: "+17735498973", lat: 41.9400214, lng: -87.6443417 },
  { name: "7-Eleven", street: "2619 N Clark St", zip: "60614", phone: "+17738689308", lat: 41.9296307, lng: -87.6424177 },
];

// Clearly fictional demonstration stores. isDemo=true drives a visible
// "demo data" badge; all prices below are synthetic.
const DEMO_STORES: Array<{
  name: string; street: string; zip: string; lat: number; lng: number;
  zyn?: { cents: number; days: number; avail?: string };
  ultra?: { cents: number; days: number };
  deal?: { minQty: number; pricePerCanCents?: number; discountPerCanCents?: number; appliesAboveMinQty?: boolean | null; conditions?: string };
  /** older superseded prices (feeds the price-history sparkline) */
  history?: Array<{ cents: number; days: number }>;
  /** availability-only fact: this store reports not carrying ZYN (no price) */
  notCarried?: { days: number };
  hours?: string;
}> = [
  { name: "Demo Fuel Stop #1 (fictional)", street: "100 Example Ave", zip: "60614", lat: 41.9289, lng: -87.6440, zyn: { cents: 649, days: 2 }, ultra: { cents: 749, days: 2 }, deal: { minQty: 5, discountPerCanCents: 100, appliesAboveMinQty: true }, history: [{ cents: 629, days: 24 }, { cents: 639, days: 16 }, { cents: 659, days: 9 }], hours: "Mon–Sat 6am–11pm, Sun 8am–9pm (demo)" },
  { name: "Demo Corner Mart #2 (fictional)", street: "200 Example St", zip: "60614", lat: 41.9222, lng: -87.6531, zyn: { cents: 599, days: 1 }, history: [{ cents: 599, days: 20 }, { cents: 619, days: 11 }] },
  { name: "Demo Gas & Go #3 (fictional)", street: "300 Example Blvd", zip: "60657", lat: 41.9403, lng: -87.6540, zyn: { cents: 729, days: 4 }, deal: { minQty: 3, pricePerCanCents: 649, appliesAboveMinQty: null, conditions: "Loyalty members only (demo)" } },
  { name: "Demo Quick Stop #4 (fictional)", street: "400 Example Rd", zip: "60613", lat: 41.9500, lng: -87.6600, zyn: { cents: 679, days: 6 }, ultra: { cents: 829, days: 6 } },
  { name: "Demo Pantry #5 (fictional)", street: "500 Example Pl", zip: "60622", lat: 41.9080, lng: -87.6570, zyn: { cents: 559, days: 3, avail: "IN_STOCK" } },
  { name: "Demo Station #6 (fictional)", street: "600 Example Dr", zip: "60618", lat: 41.9380, lng: -87.6800, zyn: { cents: 619, days: 35 } }, // stale
  { name: "Demo Depot #7 (fictional)", street: "700 Example Ct", zip: "60647", lat: 41.9170, lng: -87.6900, zyn: { cents: 699, days: 200 } }, // expired -> "no recent price"
  { name: "Demo Express #8 (fictional)", street: "800 Example Ln", zip: "60610", lat: 41.9050, lng: -87.6350, zyn: { cents: 899, days: 2, avail: "OUT_OF_STOCK" } },
  // Availability-only demo: honestly shows "Not carried" with no price.
  { name: "Demo Smoke-Free Deli #9 (fictional)", street: "900 Example Way", zip: "60614", lat: 41.9260, lng: -87.6480, notCarried: { days: 5 } },
];

async function main() {
  console.log("Seeding…");

  // --- Product lines
  const zyn = await prisma.productLine.upsert({
    where: { slug: "zyn" },
    update: {},
    create: { slug: "zyn", name: "ZYN (regular)", brand: "ZYN", sortOrder: 1, description: "Standard ZYN nicotine pouches — regular flavors/strengths are usually priced alike within a store." },
  });
  const ultra = await prisma.productLine.upsert({
    where: { slug: "zyn-ultra" },
    update: {},
    create: { slug: "zyn-ultra", name: "ZYN Ultra", brand: "ZYN", sortOrder: 2, description: "ZYN Ultra line — may be priced differently from regular ZYN." },
  });

  // --- Users (documented in docs/DEMO_GUIDE.md)
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      passwordHash: await hashPassword("admin-demo-password"),
      displayName: "Demo Admin",
      role: "ADMIN",
      reputation: 100,
      ageConfirmedAt: new Date(),
    },
  });
  const trusted = await prisma.user.upsert({
    where: { email: "trusted@example.com" },
    update: {},
    create: {
      email: "trusted@example.com",
      passwordHash: await hashPassword("trusted-demo-password"),
      displayName: "TrustedTina (demo)",
      role: "USER",
      reputation: 80,
      createdAt: daysAgo(120),
      ageConfirmedAt: new Date(),
    },
  });
  const newbie = await prisma.user.upsert({
    where: { email: "newbie@example.com" },
    update: {},
    create: {
      email: "newbie@example.com",
      passwordHash: await hashPassword("newbie-demo-password"),
      displayName: "NewUserNed (demo)",
      role: "USER",
      reputation: 0,
      ageConfirmedAt: new Date(),
    },
  });

  // Reputation ledger baselines: User.reputation is a cached sum of
  // ReputationEvent (reconciled by scripts/maintenance.mjs), so seeded
  // grants get matching ledger entries. Idempotent via the SEED_GRANT marker.
  for (const u of [
    { id: admin.id, delta: 100 },
    { id: trusted.id, delta: 80 },
  ]) {
    const existing = await prisma.reputationEvent.findFirst({
      where: { userId: u.id, reason: "SEED_GRANT" },
    });
    if (!existing) {
      await prisma.reputationEvent.create({
        data: { userId: u.id, delta: u.delta, reason: "SEED_GRANT", refType: "admin" },
      });
    }
  }

  // --- Real store directory (no prices!)
  for (const s of REAL_STORES) {
    const existing = await prisma.storeIdentity.findFirst({
      where: { kind: "ADDRESS", value: normalizeAddressSeed(`${s.street} chicago il ${s.zip}`) },
    });
    if (existing) continue;
    const store = await prisma.store.create({
      data: {
        name: s.name,
        address: s.street,
        city: "Chicago",
        state: "IL",
        zip: s.zip,
        latitude: s.lat,
        longitude: s.lng,
        phone: s.phone,
        isDemo: false,
      },
    });
    await prisma.storeIdentity.create({
      data: { storeId: store.id, kind: "ADDRESS", value: normalizeAddressSeed(`${s.street} chicago il ${s.zip}`) },
    });
    await prisma.storeIdentity
      .create({ data: { storeId: store.id, kind: "PHONE", value: s.phone } })
      .catch(() => {}); // two Exxons share a corporate line
  }
  // Flag the shared-phone Exxons as a duplicate candidate for admin review.
  const exxons = await prisma.store.findMany({ where: { phone: "+19728287250" }, orderBy: { address: "asc" } });
  if (exxons.length === 2) {
    const [a, b] = [exxons[0].id, exxons[1].id].sort();
    await prisma.duplicateCandidate.upsert({
      where: { storeAId_storeBId: { storeAId: a, storeBId: b } },
      update: {},
      create: { storeAId: a, storeBId: b, reason: "Shared phone number (likely corporate line, different addresses)", score: 0.4 },
    });
  }

  // --- Demo stores with synthetic prices
  for (const s of DEMO_STORES) {
    const addrKey = normalizeAddressSeed(`${s.street} chicago il ${s.zip}`);
    const existing = await prisma.storeIdentity.findFirst({ where: { kind: "ADDRESS", value: addrKey } });
    if (existing) continue;
    const store = await prisma.store.create({
      data: {
        name: s.name,
        address: s.street,
        city: "Chicago",
        state: "IL",
        zip: s.zip,
        latitude: s.lat,
        longitude: s.lng,
        isDemo: true,
        hours: s.hours ?? null,
      },
    });
    await prisma.storeIdentity.create({
      data: { storeId: store.id, kind: "ADDRESS", value: addrKey },
    });
    if (s.zyn) {
      await prisma.priceObservation.create({
        data: {
          storeId: store.id,
          productLineId: zyn.id,
          priceCents: s.zyn.cents,
          taxIncluded: false,
          availability: s.zyn.avail ?? "IN_STOCK",
          observedAt: daysAgo(s.zyn.days),
          sourceType: "ADMIN",
          confidence: 1,
          notes: "Synthetic demonstration price (seeded, fictional store).",
        },
      });
    }
    if (s.ultra) {
      await prisma.priceObservation.create({
        data: {
          storeId: store.id,
          productLineId: ultra.id,
          priceCents: s.ultra.cents,
          taxIncluded: false,
          availability: "IN_STOCK",
          observedAt: daysAgo(s.ultra.days),
          sourceType: "ADMIN",
          confidence: 1,
          notes: "Synthetic demonstration price (seeded, fictional store).",
        },
      });
    }
    if (s.history) {
      for (const h of s.history) {
        await prisma.priceObservation.create({
          data: {
            storeId: store.id,
            productLineId: zyn.id,
            priceCents: h.cents,
            taxIncluded: false,
            availability: "IN_STOCK",
            observedAt: daysAgo(h.days),
            sourceType: "ADMIN",
            confidence: 1,
            status: "SUPERSEDED",
            notes: "Synthetic demonstration price history (seeded, fictional store).",
          },
        });
      }
    }
    if (s.notCarried) {
      await prisma.priceObservation.create({
        data: {
          storeId: store.id,
          productLineId: zyn.id,
          priceCents: null, // availability-only: no price is ever invented
          availability: "NOT_CARRIED",
          observedAt: daysAgo(s.notCarried.days),
          sourceType: "ADMIN",
          confidence: 1,
          notes: "Synthetic demonstration availability report (seeded, fictional store).",
        },
      });
    }
    if (s.deal) {
      await prisma.quantityDeal.create({
        data: {
          storeId: store.id,
          productLineId: zyn.id,
          minQty: s.deal.minQty,
          pricePerCanCents: s.deal.pricePerCanCents ?? null,
          discountPerCanCents: s.deal.discountPerCanCents ?? null,
          appliesAboveMinQty: s.deal.appliesAboveMinQty ?? null,
          conditions: s.deal.conditions ?? null,
          observedAt: daysAgo(s.zyn?.days ?? 2),
          sourceType: "ADMIN",
        },
      });
    }
  }

  // --- Synthetic price history for a few demo stores (drives the store-page
  // sparkline). Older observations are stored as SUPERSEDED — they were
  // replaced by the newer seeded price above. Idempotent: skipped when the
  // store already has more than one ZYN observation.
  const DEMO_HISTORY: Array<{ street: string; zip: string; series: Array<{ cents: number; days: number }> }> = [
    // Gentle decline toward today's 649
    { street: "100 Example Ave", zip: "60614", series: [{ cents: 729, days: 88 }, { cents: 699, days: 61 }, { cents: 699, days: 40 }, { cents: 679, days: 21 }] },
    // Stable then a drop to today's 559
    { street: "500 Example Pl", zip: "60622", series: [{ cents: 599, days: 75 }, { cents: 599, days: 47 }, { cents: 589, days: 26 }] },
    // Creeping up to today's 729
    { street: "300 Example Blvd", zip: "60657", series: [{ cents: 679, days: 83 }, { cents: 699, days: 52 }, { cents: 719, days: 28 }] },
  ];
  for (const h of DEMO_HISTORY) {
    const identity = await prisma.storeIdentity.findFirst({
      where: { kind: "ADDRESS", value: normalizeAddressSeed(`${h.street} chicago il ${h.zip}`) },
    });
    if (!identity) continue;
    const zynCount = await prisma.priceObservation.count({
      where: { storeId: identity.storeId, productLineId: zyn.id },
    });
    if (zynCount > 1) continue; // history already seeded
    await prisma.priceObservation.createMany({
      data: h.series.map((p) => ({
        storeId: identity.storeId,
        productLineId: zyn.id,
        priceCents: p.cents,
        taxIncluded: false,
        availability: "IN_STOCK",
        observedAt: daysAgo(p.days),
        sourceType: "ADMIN" as const,
        status: "SUPERSEDED" as const,
        confidence: 1,
        notes: "Synthetic demonstration price history (seeded, fictional store).",
      })),
      skipDuplicates: true,
    });
  }

  // --- Demo community activity on demo store #1
  const demo1Identity = await prisma.storeIdentity.findFirst({
    where: { kind: "ADDRESS", value: normalizeAddressSeed("100 Example Ave chicago il 60614") },
  });
  if (demo1Identity) {
    const obs = await prisma.priceObservation.findFirst({
      where: { storeId: demo1Identity.storeId, status: "ACTIVE" },
      orderBy: { observedAt: "desc" },
    });
    if (obs) {
      const existingV = await prisma.verification.findFirst({ where: { observationId: obs.id, userId: trusted.id } });
      if (!existingV) {
        await prisma.verification.create({
          data: { observationId: obs.id, userId: trusted.id, verdict: "CONFIRM", weight: 1 },
        });
        await prisma.contribution.create({
          data: {
            userId: trusted.id, storeId: demo1Identity.storeId, productLineId: obs.productLineId,
            kind: "CONFIRM", targetObservationId: obs.id, status: "PUBLISHED",
            comment: "Matches what I paid today (demo).",
          },
        });
        await prisma.comment.create({
          data: {
            storeId: demo1Identity.storeId, userId: newbie.id,
            body: "They had the peppermint 6mg back in stock this week. (demo comment)",
          },
        });
      }
    }
  }

  console.log("Seed complete.", {
    stores: await prisma.store.count(),
    observations: await prisma.priceObservation.count(),
    users: await prisma.user.count(),
    admin: admin.email,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
