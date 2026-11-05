// Search benchmark at realistic scale.
//
// Seeds N clearly-fictional synthetic stores (isDemo, "Bench Store #i") with
// observations/deals into the database DATABASE_URL points at, then measures
// searchStores() latency. ALWAYS point this at a throwaway database:
//
//   DATABASE_URL=postgresql://nicfinder:nicfinder_dev@localhost:5432/nicfinder_bench \
//     npx tsx scripts/bench-search.ts [storeCount]
//
// Refuses to run unless the DB name contains "bench" or "test" so it can
// never pollute a real dataset with synthetic stores.

import { prisma } from "../src/lib/db";
import { searchStores } from "../src/lib/search";

const STORES = Number(process.argv[2] ?? 10_000);
const CENTER = { lat: 41.8781, lng: -87.6298 }; // Chicago Loop

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  const dbName = url.split("/").pop()?.split("?")[0] ?? "";
  if (!/bench|test/.test(dbName)) {
    throw new Error(
      `Refusing to run against database "${dbName}" — use a throwaway DB whose name contains "bench" or "test".`
    );
  }

  const rand = mulberry32(42);
  const existing = await prisma.store.count({ where: { name: { startsWith: "Bench Store #" } } });

  let zyn = await prisma.productLine.findUnique({ where: { slug: "zyn" } });
  zyn ??= await prisma.productLine.create({
    data: { slug: "zyn", name: "ZYN (regular)", brand: "ZYN", sortOrder: 1 },
  });

  if (existing < STORES) {
    console.log(`Seeding ${STORES - existing} synthetic stores (have ${existing})…`);
    const t0 = performance.now();
    const batch = 500;
    for (let i = existing; i < STORES; i += batch) {
      const stores = [];
      for (let j = i; j < Math.min(i + batch, STORES); j++) {
        // Scatter within ~0.35° (~25mi) of the Loop
        const lat = CENTER.lat + (rand() - 0.5) * 0.7;
        const lng = CENTER.lng + (rand() - 0.5) * 0.7;
        stores.push({
          name: `Bench Store #${j} (fictional)`,
          address: `${j} Synthetic Ave`,
          city: "Chicago",
          state: "IL",
          zip: "60601",
          latitude: Math.round(lat * 1e5) / 1e5,
          longitude: Math.round(lng * 1e5) / 1e5,
          isDemo: true,
        });
      }
      await prisma.store.createMany({ data: stores });
    }
    // ~60% of stores get 1–4 observations, 20% get a deal
    const all = await prisma.store.findMany({
      where: { name: { startsWith: "Bench Store #" } },
      select: { id: true },
    });
    const obs: {
      storeId: string;
      productLineId: string;
      priceCents: number;
      observedAt: Date;
      sourceType: string;
    }[] = [];
    const deals: {
      storeId: string;
      productLineId: string;
      minQty: number;
      discountPerCanCents: number;
      observedAt: Date;
      sourceType: string;
    }[] = [];
    for (const s of all) {
      if (rand() < 0.6) {
        const n = 1 + Math.floor(rand() * 4);
        for (let k = 0; k < n; k++) {
          obs.push({
            storeId: s.id,
            productLineId: zyn.id,
            priceCents: 450 + Math.floor(rand() * 450),
            observedAt: new Date(Date.now() - Math.floor(rand() * 20) * 86400_000),
            sourceType: "IMPORT",
          });
        }
      }
      if (rand() < 0.2) {
        deals.push({
          storeId: s.id,
          productLineId: zyn.id,
          minQty: 5,
          discountPerCanCents: 100,
          observedAt: new Date(),
          sourceType: "IMPORT",
        });
      }
    }
    for (let i = 0; i < obs.length; i += 2000)
      await prisma.priceObservation.createMany({ data: obs.slice(i, i + 2000) });
    for (let i = 0; i < deals.length; i += 2000)
      await prisma.quantityDeal.createMany({ data: deals.slice(i, i + 2000) });
    console.log(
      `Seeded in ${Math.round(performance.now() - t0)}ms: ${all.length} stores, ${obs.length} observations, ${deals.length} deals`
    );
  }

  for (const radius of [1, 2, 5, 10, 25]) {
    const times: number[] = [];
    let resultCount = 0;
    for (let i = 0; i < 8; i++) {
      const t = performance.now();
      const r = await searchStores({
        lat: CENTER.lat,
        lng: CENTER.lng,
        radiusMiles: radius,
        productSlug: "zyn",
        qty: 5,
        sort: "price",
      });
      times.push(performance.now() - t);
      resultCount = r.results.length;
    }
    times.sort((a, b) => a - b);
    const median = times[Math.floor(times.length / 2)];
    console.log(
      `radius=${String(radius).padStart(2)}mi results=${String(resultCount).padStart(3)} ` +
        `median=${median.toFixed(1)}ms min=${times[0].toFixed(1)}ms max=${times[times.length - 1].toFixed(1)}ms`
    );
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
