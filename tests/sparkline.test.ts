import { describe, expect, it } from "vitest";
import { trendSummary } from "@/components/PriceSparkline";

const day = 86400_000;
const t0 = Date.parse("2026-08-01T12:00:00Z");

describe("trendSummary", () => {
  it("returns null for fewer than 2 points", () => {
    expect(trendSummary([])).toBeNull();
    expect(trendSummary([{ t: t0, cents: 599 }])).toBeNull();
  });

  it("returns null when all points are within the same day", () => {
    expect(
      trendSummary([
        { t: t0, cents: 599 },
        { t: t0 + 3600_000, cents: 649 },
      ])
    ).toBeNull();
  });

  it("computes a decline from oldest to newest regardless of input order", () => {
    const res = trendSummary([
      { t: t0 + 90 * day, cents: 649 }, // newest first
      { t: t0, cents: 729 },
      { t: t0 + 40 * day, cents: 699 },
    ]);
    expect(res).toEqual({ deltaCents: -80, days: 90 });
  });

  it("computes an increase and zero delta for flat series", () => {
    expect(
      trendSummary([
        { t: t0, cents: 599 },
        { t: t0 + 10 * day, cents: 639 },
      ])
    ).toEqual({ deltaCents: 40, days: 10 });
    expect(
      trendSummary([
        { t: t0, cents: 599 },
        { t: t0 + 10 * day, cents: 599 },
      ])
    ).toEqual({ deltaCents: 0, days: 10 });
  });
});
