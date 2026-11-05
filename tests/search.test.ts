import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb, seedProductLines } from "./helpers";
import { searchStores } from "@/lib/search";

// Chicago-ish center; ~0.0145° latitude ≈ 1 mile.
const CENTER = { lat: 41.9, lng: -87.65 };
const latAt = (miles: number) => CENTER.lat + miles / 69;

async function makeStore(opts: {
  name: string;
  miles: number;
  priceCents?: number | null;
  observedDaysAgo?: number;
  availability?: string;
  dealDiscount?: number;
}) {
  const zyn = await prisma.productLine.findUniqueOrThrow({ where: { slug: "zyn" } });
  const store = await prisma.store.create({
    data: {
      name: opts.name,
      latitude: latAt(opts.miles),
      longitude: CENTER.lng,
      isDemo: true,
    },
  });
  if (opts.priceCents !== undefined || opts.availability) {
    await prisma.priceObservation.create({
      data: {
        storeId: store.id,
        productLineId: zyn.id,
        priceCents: opts.priceCents ?? null,
        availability: opts.availability ?? "IN_STOCK",
        observedAt: new Date(Date.now() - (opts.observedDaysAgo ?? 1) * 86400_000),
        sourceType: "ADMIN",
      },
    });
  }
  if (opts.dealDiscount) {
    await prisma.quantityDeal.create({
      data: {
        storeId: store.id,
        productLineId: zyn.id,
        minQty: 5,
        discountPerCanCents: opts.dealDiscount,
        appliesAboveMinQty: true,
        observedAt: new Date(),
        sourceType: "ADMIN",
      },
    });
  }
  return store;
}

const run = (opts: Partial<Parameters<typeof searchStores>[0]> = {}) =>
  searchStores({
    lat: CENTER.lat,
    lng: CENTER.lng,
    radiusMiles: 5,
    productSlug: "zyn",
    qty: 1,
    sort: "distance",
    ...opts,
  });

describe("searchStores", () => {
  beforeEach(async () => {
    await resetDb();
    await seedProductLines();
  });

  it("filters by radius and sorts by distance", async () => {
    await makeStore({ name: "Near", miles: 0.5, priceCents: 649 });
    await makeStore({ name: "Mid", miles: 3, priceCents: 629 });
    await makeStore({ name: "Far", miles: 10, priceCents: 599 }); // outside 5mi
    const { results } = await run();
    expect(results.map((r) => r.name)).toEqual(["Near", "Mid"]);
    expect(results[0].distanceMiles).toBeLessThan(1);
  });

  it("price sort puts definite prices first, unpriced after, ties by distance", async () => {
    await makeStore({ name: "NoPrice", miles: 0.2 });
    await makeStore({ name: "Cheap", miles: 4, priceCents: 549 });
    await makeStore({ name: "Pricey", miles: 1, priceCents: 749 });
    const { results } = await run({ sort: "price" });
    expect(results.map((r) => r.name)).toEqual(["Cheap", "Pricey", "NoPrice"]);
  });

  it("applies deal math at quantity (buy 5, $1 off each)", async () => {
    await makeStore({ name: "DealStore", miles: 1, priceCents: 649, dealDiscount: 100 });
    const { results } = await run({ qty: 5 });
    const r = results[0];
    expect(r.effective.perCanCents).toBe(549);
    expect(r.effective.totalCents).toBe(549 * 5);
    expect(r.effective.usedDeal).toBe(true);
  });

  it("expired observations yield no price; availability signal still surfaces", async () => {
    await makeStore({
      name: "NotCarried",
      miles: 1,
      priceCents: null,
      availability: "NOT_CARRIED",
      observedDaysAgo: 2,
    });
    await makeStore({ name: "Ancient", miles: 2, priceCents: 649, observedDaysAgo: 200 });
    const { results } = await run();
    const nc = results.find((r) => r.name === "NotCarried")!;
    expect(nc.latest).toBeNull();
    expect(nc.availabilitySignal?.availability).toBe("NOT_CARRIED");
    const ancient = results.find((r) => r.name === "Ancient")!;
    expect(ancient.latest).toBeNull(); // expired — honest "no recent price"
  });

  it("caps results at the NEAREST 500, never an arbitrary subset", async () => {
    const zyn = await prisma.productLine.findUniqueOrThrow({ where: { slug: "zyn" } });
    // 505 stores at increasing distance, the farthest 5 clearly marked.
    const rows = [];
    for (let i = 0; i < 505; i++) {
      rows.push({
        name: i >= 500 ? `Farthest ${i}` : `S${i}`,
        latitude: latAt(0.001 * i + 0.01),
        longitude: CENTER.lng,
        isDemo: true,
      });
    }
    await prisma.store.createMany({ data: rows });
    void zyn;
    const { results } = await run({ radiusMiles: 5 });
    expect(results).toHaveLength(500);
    // The 5 farthest are exactly the ones cut.
    expect(results.some((r) => r.name.startsWith("Farthest"))).toBe(false);
    // And ordering is by distance.
    expect(results[0].name).toBe("S0");
  });
});
