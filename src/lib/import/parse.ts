// File parsing: CSV via papaparse, XLSX via exceljs.
// Output: headers + rows of raw string/number/boolean values.

import Papa from "papaparse";
import ExcelJS from "exceljs";

export interface ParsedFile {
  headers: string[];
  rows: Record<string, unknown>[];
}

export function parseCsv(content: string): ParsedFile {
  const result = Papa.parse<Record<string, unknown>>(content.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  const headers = (result.meta.fields ?? []).filter(Boolean);
  return { headers, rows: result.data };
}

function cellValue(cell: ExcelJS.CellValue): unknown {
  if (cell === null || cell === undefined) return null;
  if (cell instanceof Date) return cell.toISOString();
  if (typeof cell === "object") {
    const c = cell as unknown as Record<string, unknown>;
    if ("result" in c) return cellValue(c.result as ExcelJS.CellValue);
    if ("text" in c) return c.text;
    if ("richText" in c)
      return (c.richText as Array<{ text: string }>).map((r) => r.text).join("");
    if ("hyperlink" in c) return c.text ?? c.hyperlink;
    return String(cell);
  }
  return cell;
}

export async function parseXlsx(buffer: Buffer): Promise<ParsedFile> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { headers: [], rows: [] };
  // Bound the damage of oversized/crafted workbooks before building row
  // objects (the 10k-row import cap is enforced later; this stops the
  // parser from materializing millions of cells first).
  if (sheet.rowCount > 50_000 || sheet.columnCount > 200) {
    throw new Error(
      `Sheet too large (${sheet.rowCount} rows × ${sheet.columnCount} columns) — 50,000 rows / 200 columns max.`
    );
  }

  const headers: string[] = [];
  const headerRow = sheet.getRow(1);
  headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
    headers[col - 1] = String(cellValue(cell.value) ?? "").trim();
  });

  const rows: Record<string, unknown>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: Record<string, unknown> = {};
    let hasValue = false;
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      const header = headers[col - 1];
      if (!header) return;
      const v = cellValue(cell.value);
      if (v !== null && v !== "") hasValue = true;
      obj[header] = v;
    });
    if (hasValue) rows.push(obj);
  });

  return { headers: headers.filter(Boolean), rows };
}

export async function parseImportFile(
  filename: string,
  buffer: Buffer
): Promise<{ parsed: ParsedFile; fileType: "csv" | "xlsx" }> {
  if (/\.xlsx$/i.test(filename)) {
    return { parsed: await parseXlsx(buffer), fileType: "xlsx" };
  }
  if (/\.csv$/i.test(filename)) {
    return { parsed: parseCsv(buffer.toString("utf-8")), fileType: "csv" };
  }
  throw new Error("Unsupported file type — upload .csv or .xlsx");
}
