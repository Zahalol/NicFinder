import { describe, expect, it } from "vitest";
import { compareTrip, DRIVING_COST_CENTS_PER_MILE } from "@/lib/trip";

describe("compareTrip", () => {
  it("returns null when the best-priced store is not farther", () => {
    expect(
      compareTrip({
        bestPerCanCents: 559,
        bestDistanceMiles: 0.3,
        altPerCanCents: 599,
        altDistanceMiles: 1.1,
        qty: 1,
      })
    ).toBeNull();
    expect(
      compareTrip({
        bestPerCanCents: 559,
        bestDistanceMiles: 1.1,
        altPerCanCents: 599,
        altDistanceMiles: 1.1,
        qty: 1,
      })
    ).toBeNull();
  });

  it("returns null when nothing is saved", () => {
    expect(
      compareTrip({
        bestPerCanCents: 599,
        bestDistanceMiles: 2,
        altPerCanCents: 599,
        altDistanceMiles: 0.5,
        qty: 3,
      })
    ).toBeNull();
  });

  it("returns null for invalid quantity", () => {
    expect(
      compareTrip({
        bestPerCanCents: 559,
        bestDistanceMiles: 2,
        altPerCanCents: 599,
        altDistanceMiles: 0.5,
        qty: 0,
      })
    ).toBeNull();
  });

  it("computes savings, round-trip miles, driving cost, and net", () => {
    const res = compareTrip({
      bestPerCanCents: 559,
      bestDistanceMiles: 1.1,
      altPerCanCents: 599,
      altDistanceMiles: 0.3,
      qty: 5,
    });
    expect(res).not.toBeNull();
    expect(res!.savingsCents).toBe(200); // 40¢ × 5
    expect(res!.extraRoundTripMiles).toBeCloseTo(1.6);
    expect(res!.drivingCostCents).toBe(Math.round(1.6 * DRIVING_COST_CENTS_PER_MILE));
    expect(res!.netCents).toBe(res!.savingsCents - res!.drivingCostCents);
  });

  it("scales savings with quantity (1 can may not be worth it, 10 may be)", () => {
    const base = {
      bestPerCanCents: 559,
      bestDistanceMiles: 3,
      altPerCanCents: 599,
      altDistanceMiles: 0.5,
    };
    const one = compareTrip({ ...base, qty: 1 })!;
    const ten = compareTrip({ ...base, qty: 10 })!;
    expect(one.netCents).toBeLessThan(0);
    expect(ten.netCents).toBeGreaterThan(0);
  });
});
