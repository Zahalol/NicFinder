// Generates sample-data/sample-import.xlsx from sample-import.csv using the
// same headers the importer expects. Run: node scripts/make-sample-xlsx.mjs
import ExcelJS from "exceljs";
import fs from "node:fs";
import path from "node:path";

const csvPath = path.join(process.cwd(), "sample-data", "sample-import.csv");
const outPath = path.join(process.cwd(), "sample-data", "sample-import.xlsx");

// Minimal CSV parse (our sample has one quoted field, no embedded commas in it)
function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

const lines = fs.readFileSync(csvPath, "utf-8").trim().split("\n");
const rows = lines.map(parseCsvLine);

const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet("observations");
for (const r of rows) ws.addRow(r.map((v) => (v === "" ? null : v)));
ws.getRow(1).font = { bold: true };

await wb.xlsx.writeFile(outPath);
console.log("Wrote", outPath);
