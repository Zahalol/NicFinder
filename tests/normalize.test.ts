import { describe, it, expect } from "vitest";
import { normalizePhone, normalizeAddress, nameSimilarity, splitUsAddress } from "@/lib/normalize";
import { autoMapHeaders } from "@/lib/import/contract";

describe("normalization", () => {
  it("normalizes US phones to E.164", () => {
    expect(normalizePhone("(773) 935-7042")).toBe("+17739357042");
    expect(normalizePhone("17739357042")).toBe("+17739357042");
    expect(normalizePhone("+17739357042")).toBe("+17739357042");
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
  });

  it("normalizes addresses with abbreviations", () => {
    expect(normalizeAddress("1160 W. Diversey Parkway")).toBe(
      normalizeAddress("1160 West Diversey Pkwy")
    );
    expect(normalizeAddress("  801  W Addison St. ")).toBe("801 w addison st");
  });

  it("splits full US addresses", () => {
    const p = splitUsAddress("1160 W Diversey Pkwy, Chicago, IL 60614");
    expect(p).toEqual({ street: "1160 W Diversey Pkwy", city: "Chicago", state: "IL", zip: "60614" });
  });

  it("name similarity distinguishes brands", () => {
    expect(nameSimilarity("Shell", "Shell ")).toBeGreaterThan(0.9);
    expect(nameSimilarity("Shell", "Circle K")).toBeLessThan(0.3);
    expect(nameSimilarity("bp", "BP")).toBe(1);
  });
});

describe("header auto-mapping", () => {
  it("maps aliases from the historical spreadsheet shape", () => {
    const { mapping } = autoMapHeaders([
      " Store Name", " Address", "PhoneNumber", "Latitude", "Longitude", "ZYN Price", "Last Call",
    ]);
    expect(mapping[" Store Name"]).toBe("store_name");
    expect(mapping["PhoneNumber"]).toBe("phone");
    expect(mapping["ZYN Price"]).toBe("price_usd");
    expect(mapping["Last Call"]).toBe("observed_at");
  });

  it("reports unmapped headers rather than guessing", () => {
    const { mapping, unmapped } = autoMapHeaders(["store_name", "weird_column_xyz"]);
    expect(mapping["store_name"]).toBe("store_name");
    expect(mapping["weird_column_xyz"]).toBeNull();
    expect(unmapped).toContain("weird_column_xyz");
  });

  it("never maps two columns to one field", () => {
    const { mapping } = autoMapHeaders(["price", "price_usd"]);
    const targets = Object.values(mapping).filter(Boolean);
    expect(new Set(targets).size).toBe(targets.length);
  });
});
