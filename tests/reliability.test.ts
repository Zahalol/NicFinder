import { describe, it, expect } from "vitest";
import { assessReliability } from "@/lib/reliability";

const base = {
  ageDays: 1,
  staleAfterDays: 21,
  sourceType: "IMPORT",
  confirmCount: 0,
  disputeCount: 0,
  confidence: null as number | null,
};

describe("price reliability tiers", () => {
  it("fresh staff/call-verified prices are high confidence", () => {
    const r = assessReliability({ ...base, sourceType: "CALL", ageDays: 0 });
    expect(r.level).toBe("high");
    expect(r.reasons).toContain("verified by store call");
  });

  it("fresh import without corroboration is medium", () => {
    const r = assessReliability({ ...base });
    expect(r.level).toBe("medium");
  });

  it("corroboration upgrades; an import with 1 confirm reaches high", () => {
    const r = assessReliability({ ...base, confirmCount: 1 });
    expect(r.level).toBe("high");
    expect(r.reasons).toContain("confirmed by 1 member");
  });

  it("an unconfirmed community report that has gone stale is low", () => {
    const r = assessReliability({ ...base, sourceType: "COMMUNITY", ageDays: 25 });
    expect(r.level).toBe("low");
    expect(r.reasons).toContain("stale — 25d old");
  });

  it("disputes drag any price down", () => {
    const r = assessReliability({
      ...base,
      sourceType: "ADMIN",
      ageDays: 0,
      disputeCount: 2,
    });
    expect(r.level).toBe("low");
    expect(r.reasons).toContain("disputed by 2 members");
  });

  it("low source confidence costs a step", () => {
    // 10d-old import: medium at decent confidence, low when the source
    // itself marked the row low-confidence.
    const inputs = { ...base, ageDays: 10 };
    expect(assessReliability({ ...inputs, confidence: 0.9 }).level).toBe("medium");
    const low = assessReliability({ ...inputs, confidence: 0.3 });
    expect(low.level).toBe("low");
    expect(low.reasons).toContain("source marked this low-confidence");
  });

  it("every factor used appears in the reasons (auditability)", () => {
    const r = assessReliability({
      ...base,
      sourceType: "COMMUNITY",
      confirmCount: 2,
      disputeCount: 1,
      confidence: 0.2,
      ageDays: 30,
    });
    expect(r.reasons.join("; ")).toMatch(/stale/);
    expect(r.reasons.join("; ")).toMatch(/community/);
    expect(r.reasons.join("; ")).toMatch(/confirmed by 2/);
    expect(r.reasons.join("; ")).toMatch(/disputed by 1/);
    expect(r.reasons.join("; ")).toMatch(/low-confidence/);
  });
});
