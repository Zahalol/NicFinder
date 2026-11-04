// Value-of-trip comparison: "is the cheaper store worth the extra drive?"
//
// Honesty rules: we compare can cost only against the *nearest* store with a
// usable total at the chosen quantity. We state the extra distance and let
// the user decide — no invented fuel/time costs. Stores with uncertain deal
// math (unknown terms at this qty) are excluded rather than guessed.

import type { StoreResult } from "./search";

export interface TripValue {
  /** cents saved on the chosen quantity vs the nearest comparable store */
  savingsCents: number;
  /** additional one-way distance vs that nearest store (miles, >= 0.1) */
  extraMiles: number;
  /** the store being compared against */
  baselineName: string;
}

interface Comparable {
  id: string;
  name: string;
  distanceMiles: number;
  totalCents: number | null;
  uncertain: boolean;
}

export function toComparable(r: StoreResult): Comparable {
  return {
    id: r.id,
    name: r.name,
    distanceMiles: r.distanceMiles,
    totalCents: r.effective.totalCents,
    uncertain: r.effective.uncertain,
  };
}

/**
 * For each store, the saving (if any) vs the nearest store with a definite
 * total. Returns a map keyed by store id; only stores that are farther AND
 * cheaper than the baseline get an entry.
 */
export function computeTripValues(stores: Comparable[]): Map<string, TripValue> {
  const out = new Map<string, TripValue>();
  const priced = stores.filter((s) => s.totalCents !== null && !s.uncertain);
  if (priced.length < 2) return out;

  const baseline = priced.reduce((a, b) =>
    b.distanceMiles < a.distanceMiles ? b : a
  );

  for (const s of priced) {
    if (s.id === baseline.id) continue;
    const savingsCents = baseline.totalCents! - s.totalCents!;
    const extraMiles = Math.round((s.distanceMiles - baseline.distanceMiles) * 10) / 10;
    if (savingsCents > 0 && extraMiles >= 0.1) {
      out.set(s.id, { savingsCents, extraMiles, baselineName: baseline.name });
    }
  }
  return out;
}
