// Integration tests for the core store search (lib/search.ts) against the
// isolated test database: radius filtering, sort policies, deal application,
// and the honesty rule that expired observations yield "no price".
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { searchStores } from "@/lib/search";
import { resetDb, seedProductLines } from "./helpers";

// Chicago-ish anchor point.
const AT = { lat: 41.92, lng: -87.65 };
const day = 86400_000;

async function makeStore(opts: {
  name: string;
  latOffset?: number; // ~0.0145 lat deg per mile
  priceCents?: number;
  ageDays?: number;
  deal?: { minQty: number; discountPerCanCents: number; appliesAboveMinQty: boolean };
  zynId: string;
}) {
  const store = await prisma.store.create({
    data: {
      name: opts.name,
      address: "1 Test St",
      city: "Chicago",
      state: "IL",
      zip: "60614",
      latitude: AT.lat + (opts.latOffset ?? 0),
      longitude: AT.lng,
    },
  });
  if (opts.priceCents !== undefined) {
    await prisma.priceObservation.create({
      data: {
        storeId: store.id,
        productLineId: opts.zynId,
        priceCents: opts.priceCents,
        observedAt: new Date(Date.now() - (opts.ageDays ?? 1) * day),
        sourceType: "ADMIN",
      },
    });
  }
  if (opts.deal) {
    await prisma.quantityDeal.create({
      data: {
        storeId: store.id,
        productLineId: opts.zynId,
        minQty: opts.deal.minQty,
        discountPerCanCents: opts.deal.discountPerCanCents,
        appliesAboveMinQty: opts.deal.appliesAboveMinQty,
        observedAt: new Date(),
        sourceType: "ADMIN",
      },
    });
  }
  return store;
}

describe("searchStores", () => {
  beforeAll(async () => {
    await resetDb();
    const { zyn } = await seedProductLines();
    // near+cheap-with-deal, nearest+pricier, far, unpriced, stale(expired), out-of-radius
    await makeStore({ name: "NearDeal", latOffset: 0.0145, priceCents: 649, zynId: zyn.id, deal: { minQty: 5, discountPerCanCents: 100, appliesAboveMinQty: true } }); // ~1mi
    await makeStore({ name: "Nearest", latOffset: 0.004, priceCents: 599, zynId: zyn.id }); // ~0.3mi
    await makeStore({ name: "Far", latOffset: 0.0435, priceCents: 549, zynId: zyn.id }); // ~3mi
    await makeStore({ name: "Directory", latOffset: 0.007, zynId: zyn.id }); // no price
    await makeStore({ name: "Expired", latOffset: 0.01, priceCents: 100, ageDays: 400, zynId: zyn.id });
    await makeStore({ name: "TooFarAway", latOffset: 0.3, priceCents: 1, zynId: zyn.id }); // ~20mi
  });

  it("filters by radius", async () => {
    const { results } = await searchStores({ ...AT, radiusMiles: 5, productSlug: "zyn", qty: 1, sort: "distance" });
    const names = results.map((r) => r.name);
    expect(names).toContain("Far");
    expect(names).not.toContain("TooFarAway");
  });

  it("expired observations yield no price (honesty rule)", async () => {
    const { results } = await searchStores({ ...AT, radiusMiles: 5, productSlug: "zyn", qty: 1, sort: "distance" });
    const expired = results.find((r) => r.name === "Expired")!;
    expect(expired.latest).toBeNull();
    expect(expired.effective.perCanCents).toBeNull();
  });

  it("distance sort orders by proximity", async () => {
    const { results } = await searchStores({ ...AT, radiusMiles: 5, productSlug: "zyn", qty: 1, sort: "distance" });
    const names = results.map((r) => r.name);
    expect(names.indexOf("Nearest")).toBeLessThan(names.indexOf("NearDeal"));
    expect(names.indexOf("NearDeal")).toBeLessThan(names.indexOf("Far"));
  });

  it("price sort puts priced stores first, cheapest leading", async () => {
    const { results } = await searchStores({ ...AT, radiusMiles: 5, productSlug: "zyn", qty: 1, sort: "price" });
    expect(results[0].name).toBe("Far"); // 549 cheapest at qty 1
    const priced = results.filter((r) => r.effective.perCanCents !== null).length;
    for (let i = 0; i < results.length; i++) {
      const hasPrice = results[i].effective.perCanCents !== null;
      expect(hasPrice).toBe(i < priced); // no unpriced store ahead of a priced one
    }
  });

  it("applies quantity deals to effective per-can price", async () => {
    const { results } = await searchStores({ ...AT, radiusMiles: 5, productSlug: "zyn", qty: 5, sort: "price" });
    const dealStore = results.find((r) => r.name === "NearDeal")!;
    expect(dealStore.effective.perCanCents).toBe(549); // 649 - 100
    expect(dealStore.effective.usedDeal).toBe(true);
    // At qty 5 the deal ties "Far" (549); distance breaks the tie.
    expect(results[0].name).toBe("NearDeal");
  });

  it("unknown product slug returns nothing", async () => {
    const { results, productLineId } = await searchStores({ ...AT, radiusMiles: 5, productSlug: "nope", qty: 1, sort: "distance" });
    expect(results).toEqual([]);
    expect(productLineId).toBeNull();
  });
});
