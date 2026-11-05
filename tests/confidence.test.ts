import { describe, expect, it } from "vitest";
import { computeConfidence } from "@/lib/confidence";

describe("computeConfidence", () => {
  it("rates a fresh staff-entered price high", () => {
    const c = computeConfidence({
      sourceType: "ADMIN",
      ageDays: 1,
      confirmCount: 0,
      disputeCount: 0,
    });
    expect(c.tier).toBe("high");
    expect(c.reasons).toContain("staff-entered");
    expect(c.reasons).toContain("1 day old");
  });

  it("decays with age: a stale price is low confidence", () => {
    const fresh = computeConfidence({ sourceType: "ADMIN", ageDays: 2, confirmCount: 0, disputeCount: 0 });
    const aging = computeConfidence({ sourceType: "ADMIN", ageDays: 20, confirmCount: 0, disputeCount: 0 });
    const stale = computeConfidence({ sourceType: "ADMIN", ageDays: 35, confirmCount: 0, disputeCount: 0 });
    expect(fresh.score).toBeGreaterThan(aging.score);
    expect(aging.score).toBeGreaterThan(stale.score);
    expect(stale.tier).toBe("low");
  });

  it("confirmations raise a community report to high", () => {
    const lone = computeConfidence({ sourceType: "COMMUNITY", ageDays: 0, confirmCount: 0, disputeCount: 0 });
    const confirmed = computeConfidence({ sourceType: "COMMUNITY", ageDays: 0, confirmCount: 1, disputeCount: 0 });
    expect(lone.tier).toBe("medium");
    expect(confirmed.tier).toBe("high");
    expect(confirmed.reasons).toContain("1 member confirmation");
  });

  it("caps confirmation credit at 3", () => {
    const three = computeConfidence({ sourceType: "COMMUNITY", ageDays: 0, confirmCount: 3, disputeCount: 0 });
    const ten = computeConfidence({ sourceType: "COMMUNITY", ageDays: 0, confirmCount: 10, disputeCount: 0 });
    expect(ten.score).toBe(three.score);
  });

  it("disputes pull confidence down hard", () => {
    const disputed = computeConfidence({ sourceType: "ADMIN", ageDays: 1, confirmCount: 0, disputeCount: 2 });
    expect(disputed.tier).toBe("low");
    expect(disputed.reasons).toContain("2 disputes");
  });

  it("clamps to 0–100 and handles unknown sources and negative age", () => {
    const floor = computeConfidence({ sourceType: "COMMUNITY", ageDays: 400, confirmCount: 0, disputeCount: 5 });
    expect(floor.score).toBe(0);
    const weird = computeConfidence({ sourceType: "MYSTERY", ageDays: -3, confirmCount: 0, disputeCount: 0 });
    expect(weird.score).toBe(50);
    expect(weird.reasons[0]).toBe("unknown source");
  });
});
