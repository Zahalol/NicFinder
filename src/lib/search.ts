// Store search: geocode-independent core used by the search page and API.

import { prisma } from "./db";
import { boundingBox, haversineMiles } from "./geo";
import { selectLatestPrice, type LatestPrice } from "./prices";
import { effectivePerCanCents, totalCents, type DealInput } from "./deals";
import { getSettings } from "./settings";

export interface StoreResult {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
  isDemo: boolean;
  distanceMiles: number;
  latest: {
    observationId: string;
    priceCents: number;
    observedAt: string;
    ageDays: number;
    freshness: "fresh" | "stale";
    sourceType: string;
    confirmCount: number;
    disputeCount: number;
    availability: string;
    taxIncluded: boolean | null;
  } | null;
  deal: {
    minQty: number;
    pricePerCanCents: number | null;
    discountPerCanCents: number | null;
    appliesAboveMinQty: boolean | null;
    conditions: string | null;
    expiresAt: string | null;
  } | null;
  effective: {
    qty: number;
    perCanCents: number | null;
    totalCents: number | null;
    usedDeal: boolean;
    uncertain: boolean;
  };
}

export type SortKey = "distance" | "price" | "recency";

export async function searchStores(opts: {
  lat: number;
  lng: number;
  radiusMiles: number;
  productSlug: string;
  qty: number;
  sort: SortKey;
}): Promise<{ results: StoreResult[]; productLineId: string | null }> {
  const settings = await getSettings();
  const product = await prisma.productLine.findUnique({
    where: { slug: opts.productSlug },
  });
  if (!product) return { results: [], productLineId: null };

  const box = boundingBox(opts.lat, opts.lng, opts.radiusMiles);
  const stores = await prisma.store.findMany({
    where: {
      status: "ACTIVE",
      latitude: { gte: box.minLat, lte: box.maxLat },
      longitude: { gte: box.minLon, lte: box.maxLon },
    },
    include: {
      observations: {
        where: { productLineId: product.id, status: "ACTIVE" },
        include: { verifications: true },
        orderBy: { observedAt: "desc" },
        take: 10,
      },
      deals: {
        where: {
          productLineId: product.id,
          status: "ACTIVE",
          OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
        },
        orderBy: { observedAt: "desc" },
        take: 1,
      },
    },
    take: 500,
  });

  const results: StoreResult[] = [];
  for (const s of stores) {
    if (s.latitude === null || s.longitude === null) continue;
    const distance = haversineMiles(opts.lat, opts.lng, s.latitude, s.longitude);
    if (distance > opts.radiusMiles) continue;

    const latest: LatestPrice | null = selectLatestPrice(s.observations, settings);
    const dealRow = s.deals[0] ?? null;
    const deal: DealInput | null = dealRow
      ? {
          minQty: dealRow.minQty,
          pricePerCanCents: dealRow.pricePerCanCents,
          discountPerCanCents: dealRow.discountPerCanCents,
          appliesAboveMinQty: dealRow.appliesAboveMinQty,
        }
      : null;

    const regular = latest?.observation.priceCents ?? null;
    const eff = effectivePerCanCents(regular, deal, opts.qty);
    const tot = totalCents(regular, deal, opts.qty);

    results.push({
      id: s.id,
      name: s.name,
      address: s.address,
      city: s.city,
      state: s.state,
      zip: s.zip,
      latitude: s.latitude,
      longitude: s.longitude,
      isDemo: s.isDemo,
      distanceMiles: Math.round(distance * 10) / 10,
      latest: latest
        ? {
            observationId: latest.observation.id,
            priceCents: latest.observation.priceCents,
            observedAt: latest.observation.observedAt.toISOString(),
            ageDays: latest.ageDays,
            freshness: latest.freshness,
            sourceType: latest.observation.sourceType,
            confirmCount: latest.confirmCount,
            disputeCount: latest.disputeCount,
            availability: latest.observation.availability,
            taxIncluded: latest.observation.taxIncluded,
          }
        : null,
      deal: dealRow
        ? {
            minQty: dealRow.minQty,
            pricePerCanCents: dealRow.pricePerCanCents,
            discountPerCanCents: dealRow.discountPerCanCents,
            appliesAboveMinQty: dealRow.appliesAboveMinQty,
            conditions: dealRow.conditions,
            expiresAt: dealRow.expiresAt?.toISOString() ?? null,
          }
        : null,
      effective: {
        qty: opts.qty,
        perCanCents: eff.perCanCents,
        totalCents: tot,
        usedDeal: eff.usedDeal,
        uncertain: eff.uncertain,
      },
    });
  }

  // Sorting. Stores without a usable price always sort after priced stores
  // for "price"; for all sorts, demo flag does not affect order.
  results.sort((a, b) => {
    if (opts.sort === "price") {
      const ap = a.effective.perCanCents;
      const bp = b.effective.perCanCents;
      if (ap === null && bp === null) return a.distanceMiles - b.distanceMiles;
      if (ap === null) return 1;
      if (bp === null) return -1;
      if (ap !== bp) return ap - bp;
      return a.distanceMiles - b.distanceMiles;
    }
    if (opts.sort === "recency") {
      const at = a.latest ? Date.parse(a.latest.observedAt) : 0;
      const bt = b.latest ? Date.parse(b.latest.observedAt) : 0;
      if (at !== bt) return bt - at;
      return a.distanceMiles - b.distanceMiles;
    }
    return a.distanceMiles - b.distanceMiles;
  });

  return { results, productLineId: product.id };
}
