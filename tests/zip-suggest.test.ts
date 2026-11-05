import { describe, expect, it } from "vitest";
import { suggestZips } from "@/lib/zip-suggest";

describe("suggestZips", () => {
  it("returns nothing for non-ZIP input", () => {
    expect(suggestZips("hello")).toEqual([]);
    expect(suggestZips("6061")).toEqual([]);
    expect(suggestZips("606144")).toEqual([]);
  });

  it("suggests real ZIPs one digit away from a mistyped one", () => {
    // 60610..60657 are real Chicago ZIPs; 60619 exists too, so a typo like
    // 6061 + wrong last digit should recover several candidates.
    const out = suggestZips("60611"); // real itself, but variants also real
    expect(out.length).toBeGreaterThan(0);
    for (const s of out) {
      expect(s.zip).toMatch(/^\d{5}$/);
      expect(s.city.length).toBeGreaterThan(0);
      expect(s.zip).not.toBe("60611");
    }
  });

  it("prefers suggestions sharing the longest prefix (same region)", () => {
    const out = suggestZips("60614", 3);
    expect(out.length).toBe(3);
    // All Chicago-area 606xx should win over distant replacements.
    for (const s of out) expect(s.zip.startsWith("606")).toBe(true);
  });

  it("never returns the input itself", () => {
    expect(suggestZips("60614").some((s) => s.zip === "60614")).toBe(false);
  });
});
