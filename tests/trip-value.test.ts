import { describe, it, expect } from "vitest";
import { computeTripValues } from "@/lib/trip-value";

const store = (
  id: string,
  distanceMiles: number,
  totalCents: number | null,
  uncertain = false
) => ({ id, name: `Store ${id}`, distanceMiles, totalCents, uncertain });

describe("value-of-trip comparison", () => {
  it("marks farther-but-cheaper stores with savings vs the nearest priced store", () => {
    const tv = computeTripValues([
      store("near", 0.5, 3500),
      store("far", 2.0, 3000),
    ]);
    expect(tv.get("far")).toEqual({
      savingsCents: 500,
      extraMiles: 1.5,
      baselineName: "Store near",
    });
    expect(tv.has("near")).toBe(false); // baseline never gets a row
  });

  it("gives no entry when the farther store is more expensive or equal", () => {
    const tv = computeTripValues([
      store("near", 0.5, 3000),
      store("far-equal", 2.0, 3000),
      store("far-worse", 3.0, 3200),
    ]);
    expect(tv.size).toBe(0);
  });

  it("baseline is the nearest priced store, not the nearest overall", () => {
    const tv = computeTripValues([
      store("nearest-unpriced", 0.2, null),
      store("near-priced", 1.0, 3500),
      store("far", 2.0, 3200),
    ]);
    expect(tv.get("far")?.baselineName).toBe("Store near-priced");
    expect(tv.get("far")?.extraMiles).toBe(1);
  });

  it("excludes stores with uncertain deal math rather than guessing", () => {
    const tv = computeTripValues([
      store("near", 0.5, 3500),
      store("uncertain", 2.0, 2800, true),
    ]);
    expect(tv.size).toBe(0);
  });

  it("needs at least two comparable stores", () => {
    expect(computeTripValues([store("only", 1.0, 3000)]).size).toBe(0);
    expect(computeTripValues([]).size).toBe(0);
  });

  it("requires a meaningful extra distance (>= 0.1 mi)", () => {
    const tv = computeTripValues([
      store("near", 1.0, 3500),
      store("same-corner", 1.04, 3000),
    ]);
    expect(tv.size).toBe(0);
  });
});
