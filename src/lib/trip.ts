// "Worth the trip?" math: compares the savings from driving to a cheaper
// store against the estimated cost of the extra driving. Pure + unit-tested.

/**
 * Cents per mile of driving. The IRS standard mileage rate (70¢/mi for 2025,
 * the latest published when this was written) — a deliberately all-in figure
 * (fuel + wear). Shown to users as an estimate.
 */
export const DRIVING_COST_CENTS_PER_MILE = 70;

export interface TripComparison {
  /** Total savings at the chosen quantity, in cents (> 0). */
  savingsCents: number;
  /** Extra round-trip miles vs the nearer store (> 0). */
  extraRoundTripMiles: number;
  /** Estimated cost of those extra miles, in cents. */
  drivingCostCents: number;
  /** Savings minus driving cost: positive = the detour pays for itself. */
  netCents: number;
}

/**
 * Compare the best-priced store against a nearer alternative.
 * Returns null when the comparison isn't meaningful: the cheaper store is
 * not actually farther, or nothing is saved.
 */
export function compareTrip(opts: {
  bestPerCanCents: number;
  bestDistanceMiles: number;
  altPerCanCents: number;
  altDistanceMiles: number;
  qty: number;
}): TripComparison | null {
  const { bestPerCanCents, bestDistanceMiles, altPerCanCents, altDistanceMiles, qty } = opts;
  if (!Number.isFinite(qty) || qty < 1) return null;
  const extraOneWay = bestDistanceMiles - altDistanceMiles;
  if (extraOneWay <= 0) return null; // best price is also the nearer store
  const savingsCents = (altPerCanCents - bestPerCanCents) * qty;
  if (savingsCents <= 0) return null;
  const extraRoundTripMiles = Math.round(extraOneWay * 2 * 10) / 10;
  const drivingCostCents = Math.round(extraRoundTripMiles * DRIVING_COST_CENTS_PER_MILE);
  return {
    savingsCents,
    extraRoundTripMiles,
    drivingCostCents,
    netCents: savingsCents - drivingCostCents,
  };
}
