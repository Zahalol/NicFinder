import { describe, it, expect } from "vitest";
import { selectLatestPrice, type ObservationWithVerifications } from "@/lib/prices";
import { DEFAULT_SETTINGS } from "@/lib/settings";

const now = new Date("2026-11-04T12:00:00Z");

function obs(partial: Partial<ObservationWithVerifications>): ObservationWithVerifications {
  return {
    id: Math.random().toString(36).slice(2),
    storeId: "s1",
    productLineId: "p1",
    priceCents: 649,
    currency: "USD",
    taxIncluded: null,
    availability: "UNKNOWN",
    strength: null,
    flavor: null,
    canSize: null,
    observedAt: now,
    sourceType: "IMPORT",
    confidence: null,
    importRowId: null,
    contributionId: null,
    externalCallId: null,
    notes: null,
    status: "ACTIVE",
    invalidReason: null,
    createdAt: now,
    verifications: [],
    ...partial,
  } as ObservationWithVerifications;
}

const daysAgo = (n: number) => new Date(now.getTime() - n * 86400_000);

describe("latest-price selection policy", () => {
  it("picks the most recent ACTIVE observation", () => {
    const r = selectLatestPrice(
      [
        obs({ priceCents: 600, observedAt: daysAgo(5) }),
        obs({ priceCents: 700, observedAt: daysAgo(1) }),
      ],
      DEFAULT_SETTINGS,
      now
    );
    expect(r?.observation.priceCents).toBe(700);
    expect(r?.freshness).toBe("fresh");
  });

  it("ignores INVALIDATED and SUPERSEDED observations", () => {
    const r = selectLatestPrice(
      [
        obs({ priceCents: 100, observedAt: daysAgo(0), status: "INVALIDATED" }),
        obs({ priceCents: 200, observedAt: daysAgo(0), status: "SUPERSEDED" }),
        obs({ priceCents: 300, observedAt: daysAgo(2) }),
      ],
      DEFAULT_SETTINGS,
      now
    );
    expect(r?.observation.priceCents).toBe(300);
  });

  it("excludes expired observations entirely — honest 'no recent price'", () => {
    const r = selectLatestPrice(
      [obs({ observedAt: daysAgo(DEFAULT_SETTINGS.expireAfterDays + 1) })],
      DEFAULT_SETTINGS,
      now
    );
    expect(r).toBeNull();
  });

  it("labels old-but-not-expired prices stale", () => {
    const r = selectLatestPrice(
      [obs({ observedAt: daysAgo(DEFAULT_SETTINGS.staleAfterDays + 5) })],
      DEFAULT_SETTINGS,
      now
    );
    expect(r?.freshness).toBe("stale");
  });

  it("breaks observedAt ties by source priority (ADMIN > CALL > IMPORT > COMMUNITY)", () => {
    const t = daysAgo(1);
    const r = selectLatestPrice(
      [
        obs({ priceCents: 1, observedAt: t, sourceType: "COMMUNITY" }),
        obs({ priceCents: 2, observedAt: t, sourceType: "CALL" }),
        obs({ priceCents: 3, observedAt: t, sourceType: "IMPORT" }),
      ],
      DEFAULT_SETTINGS,
      now
    );
    expect(r?.observation.priceCents).toBe(2);
  });

  it("counts confirmations and disputes", () => {
    const o = obs({
      verifications: [
        { verdict: "CONFIRM" } as never,
        { verdict: "CONFIRM" } as never,
        { verdict: "REJECT" } as never,
      ],
    });
    const r = selectLatestPrice([o], DEFAULT_SETTINGS, now);
    expect(r?.confirmCount).toBe(2);
    expect(r?.disputeCount).toBe(1);
  });
});
