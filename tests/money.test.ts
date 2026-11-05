import { describe, it, expect } from "vitest";
import { parsePriceToCents, formatCents, isPriceSane } from "@/lib/money";

describe("price parsing", () => {
  it("parses common formats", () => {
    expect(parsePriceToCents("5.99")).toBe(599);
    expect(parsePriceToCents("$5.99")).toBe(599);
    expect(parsePriceToCents(" 6 ")).toBe(600);
    expect(parsePriceToCents("6.5")).toBe(650);
    expect(parsePriceToCents(6.49)).toBe(649);
    expect(parsePriceToCents("1,299.99")).toBe(129999);
  });
  it("rejects malformed values", () => {
    expect(parsePriceToCents("")).toBeNull();
    expect(parsePriceToCents(null)).toBeNull();
    expect(parsePriceToCents("abc")).toBeNull();
    expect(parsePriceToCents("-5")).toBeNull();
    expect(parsePriceToCents("5.999")).toBeNull();
    expect(parsePriceToCents("5.99.1")).toBeNull();
    expect(parsePriceToCents(NaN)).toBeNull();
  });
  it("rejects values that would overflow a Postgres Int", () => {
    expect(parsePriceToCents("30000000")).toBeNull(); // $30M → 3e9¢ > 2^31
    expect(parsePriceToCents(30_000_000)).toBeNull();
    expect(parsePriceToCents("9".repeat(40))).toBeNull();
    expect(parsePriceToCents("100000")).toBe(10_000_000); // $100k boundary ok
    expect(parsePriceToCents("100000.01")).toBeNull();
  });
  it("formats cents", () => {
    expect(formatCents(649)).toBe("$6.49");
    expect(formatCents(null)).toBe("—");
  });
  it("sanity bounds", () => {
    expect(isPriceSane(99)).toBe(false);
    expect(isPriceSane(649)).toBe(true);
    expect(isPriceSane(9999)).toBe(false);
  });
});
