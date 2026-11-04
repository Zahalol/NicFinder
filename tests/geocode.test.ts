import { describe, it, expect } from "vitest";
import { geocodeZip } from "@/lib/geocode";
import { haversineMiles, boundingBox } from "@/lib/geo";

describe("offline ZIP geocoding (acceptance 2, 3)", () => {
  it("resolves Chicago pilot ZIPs from the bundled dataset", () => {
    const r = geocodeZip("60614");
    expect(r).not.toBeNull();
    expect(r!.latitude).toBeGreaterThan(41.8);
    expect(r!.latitude).toBeLessThan(42.1);
    expect(r!.label).toContain("Chicago");
    expect(r!.approximate).toBe(true);
  });

  it("resolves ZIPs anywhere in the US (nationwide design)", () => {
    expect(geocodeZip("10001")!.label).toContain("New York");
    expect(geocodeZip("90210")!.label).toContain("Beverly Hills");
    expect(geocodeZip("99553")).not.toBeNull(); // Akutan, AK
  });

  it("returns null for unknown or malformed ZIPs — never fabricates", () => {
    expect(geocodeZip("00000")).toBeNull();
    expect(geocodeZip("abcde")).toBeNull();
    expect(geocodeZip("1234")).toBeNull();
  });
});

describe("distance math", () => {
  it("haversine is accurate for a known pair", () => {
    // Wrigley Field to Willis Tower ≈ 7.0 miles
    const d = haversineMiles(41.9484, -87.6553, 41.8789, -87.6359);
    expect(d).toBeGreaterThan(4.5);
    expect(d).toBeLessThan(5.2);
  });

  it("bounding box contains the radius circle", () => {
    const box = boundingBox(41.93, -87.65, 5);
    const d = haversineMiles(41.93, -87.65, box.maxLat, -87.65);
    expect(d).toBeGreaterThanOrEqual(5);
  });
});
