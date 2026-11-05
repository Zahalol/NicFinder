// Guards for data-file and platform invariants that once broke silently.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("bundled data integrity", () => {
  it("zip-centroids.csv keeps LF endings (CRLF once broke all ZIP search)", () => {
    const buf = fs.readFileSync(
      path.join(process.cwd(), "src", "data", "zip-centroids.csv")
    );
    expect(buf.includes("\r"), "file contains CR bytes").toBe(false);
    expect(buf.length).toBeGreaterThan(100_000); // dataset actually present
  });

  it(".gitattributes enforces LF for the centroid data", () => {
    const ga = fs.readFileSync(path.join(process.cwd(), ".gitattributes"), "utf-8");
    expect(ga).toMatch(/zip-centroids\.csv\s+(-text|text eol=lf)/);
  });

  it("sample import fixture parses with the documented row count", () => {
    const csv = fs.readFileSync(
      path.join(process.cwd(), "sample-data", "sample-import.csv"),
      "utf-8"
    );
    const rows = csv.trim().split("\n");
    expect(rows.length).toBe(11); // header + 10 data rows (e2e depends on this)
  });
});
