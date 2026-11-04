// Import-contract fuzzing: malformed, hostile and garbled inputs must come
// out of the pipeline as clean canonical rows or clear REJECTED/FLAGGED
// outcomes — never crashes, invented facts, or oversized/poisoned strings.

import { describe, it, expect, beforeEach } from "vitest";
import ExcelJS from "exceljs";
import { resetDb, seedProductLines } from "./helpers";
import { parseCsv, parseXlsx, parseImportFile } from "@/lib/import/parse";
import { autoMapHeaders } from "@/lib/import/contract";
import { validateRows, toCanonical } from "@/lib/import/engine";

async function run(csv: string) {
  const parsed = parseCsv(csv);
  const { mapping } = autoMapHeaders(parsed.headers);
  return validateRows(parsed.rows, mapping);
}

const HEADER = "store_name,address,observed_at,product_line,price_usd";

describe("import fuzzing: line endings and encodings", () => {
  beforeEach(async () => {
    await resetDb();
    await seedProductLines();
  });

  it("handles CRLF files identically to LF", async () => {
    const lf = `${HEADER}\nCRLF Store,1 A St,2026-11-01T10:00:00Z,zyn,6.49\n`;
    const crlf = lf.replace(/\n/g, "\r\n");
    const [a, b] = [await run(lf), await run(crlf)];
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
    expect(b[0].outcome).toBe(a[0].outcome);
    expect(b[0].priceCents).toBe(649);
    expect(b[0].canonical.store_name).toBe("CRLF Store");
  });

  it("strips a UTF-8 BOM before the first header", async () => {
    const csv = `﻿${HEADER}\nBOM Store,1 A St,2026-11-01T10:00:00Z,zyn,6.49\n`;
    const rows = await run(csv);
    expect(rows[0].canonical.store_name).toBe("BOM Store");
    expect(rows[0].outcome).toBe("ACCEPTED");
  });

  it("parses quoted fields with embedded commas, quotes and newlines", async () => {
    const csv = [
      HEADER + ",notes",
      `"Quote ""Mart"", Inc.","1 Main St, Suite 5",2026-11-01T10:00:00Z,zyn,6.49,"line one\nline two"`,
    ].join("\n");
    const rows = await run(csv);
    expect(rows[0].canonical.store_name).toBe(`Quote "Mart", Inc.`);
    expect(rows[0].canonical.address).toBe("1 Main St, Suite 5");
    expect(rows[0].outcome).toBe("ACCEPTED");
  });
});

describe("import fuzzing: hostile cell content", () => {
  beforeEach(async () => {
    await resetDb();
    await seedProductLines();
  });

  it("strips NUL and control characters (Postgres rejects NUL in text)", () => {
    const c = toCanonical(
      { name: "Evil\u0000Store\u0007", notes: "a\u0000b" },
      { name: "store_name", notes: "notes" }
    );
    expect(c.store_name).toBe("EvilStore");
    expect(c.notes).toBe("ab");
  });

  it("caps absurdly long cells instead of storing megabytes", () => {
    const huge = "x".repeat(1_000_000);
    const c = toCanonical(
      { name: huge, notes: huge, address: huge },
      { name: "store_name", notes: "notes", address: "address" }
    );
    expect(c.store_name!.length).toBeLessThanOrEqual(160);
    expect(c.notes!.length).toBeLessThanOrEqual(1000);
    expect(c.address!.length).toBeLessThanOrEqual(250);
  });

  it("treats spreadsheet-formula-looking values as text, never as prices", async () => {
    const csv = [
      HEADER,
      `"=SUM(1,2)","=HYPERLINK(""http://evil"")",2026-11-01T10:00:00Z,zyn,=1+5`,
    ].join("\n");
    const rows = await run(csv);
    // Formula string is not a parseable price → BAD_PRICE → rejected.
    expect(rows[0].outcome).toBe("REJECTED");
    expect(rows[0].issues.some((i) => i.code === "BAD_PRICE")).toBe(true);
    // The name survives as inert text (React escapes on render).
    expect(rows[0].canonical.store_name).toBe('=SUM(1,2)');
  });

  it("rejects Infinity/NaN/negative/overflow prices", async () => {
    for (const bad of ["Infinity", "NaN", "-6.49", "1e309", "6.4.9"]) {
      const rows = await run(`${HEADER}\nStore X,1 A St,2026-11-01T10:00:00Z,zyn,${bad}`);
      expect(rows[0].outcome, `price=${bad}`).toBe("REJECTED");
    }
  });

  it("rejects out-of-range coordinates and absurd dates", async () => {
    const csv = [
      "store_name,address,observed_at,product_line,price_usd,latitude,longitude",
      "Store A,1 A St,1969-07-20T00:00:00Z,zyn,6.49,41.9,-87.6", // pre-2000
      "Store B,2 B St,2099-01-01T00:00:00Z,zyn,6.49,41.9,-87.6", // far future
      "Store C,3 C St,2026-11-01T10:00:00Z,zyn,6.49,91,-87.6", // bad lat
      "Store D,4 D St,2026-11-01T10:00:00Z,zyn,6.49,41.9,181", // bad lng
    ].join("\n");
    const rows = await run(csv);
    for (const r of rows) expect(r.outcome).toBe("REJECTED");
  });
});

describe("import fuzzing: structural oddities", () => {
  beforeEach(async () => {
    await resetDb();
    await seedProductLines();
  });

  it("duplicate headers map once; the duplicate is surfaced as unmapped", () => {
    const { mapping, unmapped } = autoMapHeaders(["price", "price_usd", "name"]);
    const targets = Object.values(mapping).filter((t) => t === "price_usd");
    expect(targets).toHaveLength(1);
    expect(unmapped.length).toBeGreaterThanOrEqual(1);
  });

  it("whitespace-only and empty rows are skipped by greedy parsing", async () => {
    const csv = `${HEADER}\n\n   \nReal Store,1 A St,2026-11-01T10:00:00Z,zyn,6.49\n\n`;
    const rows = await run(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].canonical.store_name).toBe("Real Store");
  });

  it("a headers-only file yields zero rows, not a crash", async () => {
    const rows = await run(`${HEADER}\n`);
    expect(rows).toHaveLength(0);
  });

  it("completely alien headers map nothing and rows reject (no store identity)", async () => {
    const rows = await run(`alpha,beta,gamma\n1,2,3`);
    expect(rows[0].outcome).toBe("REJECTED");
    expect(rows[0].issues.some((i) => i.code === "NO_STORE_IDENTITY")).toBe(true);
  });

  it("refuses unsupported file extensions", async () => {
    await expect(parseImportFile("evil.exe", Buffer.from("x"))).rejects.toThrow(/Unsupported/);
    await expect(parseImportFile("noext", Buffer.from("x"))).rejects.toThrow(/Unsupported/);
  });

  it("rejects a corrupt XLSX buffer with an error, not a hang/crash", async () => {
    const junk = Buffer.from("PK\u0003\u0004 this is not really a zip archive");
    await expect(parseXlsx(junk)).rejects.toThrow();
  });
});

describe("import fuzzing: XLSX typed cells", () => {
  beforeEach(async () => {
    await resetDb();
    await seedProductLines();
  });

  it("handles native Date cells, numeric cells and formula results", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("s");
    ws.addRow(["store_name", "address", "observed_at", "product_line", "price_usd"]);
    ws.addRow(["Typed Store", "1 A St", new Date("2026-11-01T10:00:00Z"), "zyn", 6.49]);
    // Formula cell whose cached result is a number
    ws.addRow([
      "Formula Store",
      "2 B St",
      new Date("2026-11-01T10:00:00Z"),
      "zyn",
      { formula: "1+5.49", result: 6.49 },
    ]);
    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    const parsed = await parseXlsx(buffer);
    const { mapping } = autoMapHeaders(parsed.headers);
    const rows = await validateRows(parsed.rows, mapping);
    expect(rows[0].outcome).toBe("ACCEPTED");
    expect(rows[0].priceCents).toBe(649);
    expect(rows[0].observedAt?.toISOString()).toBe("2026-11-01T10:00:00.000Z");
    expect(rows[1].priceCents).toBe(649); // cached formula result, not the formula text
  });
});
