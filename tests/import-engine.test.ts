import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { resetDb, seedProductLines } from "./helpers";
import { parseCsv, parseXlsx } from "@/lib/import/parse";
import { autoMapHeaders } from "@/lib/import/contract";
import {
  validateRows,
  createPreviewBatch,
  commitBatch,
  reverseBatch,
  computeContentHash,
} from "@/lib/import/engine";

const SAMPLE_CSV = path.join(process.cwd(), "sample-data", "sample-import.csv");
const SAMPLE_XLSX = path.join(process.cwd(), "sample-data", "sample-import.xlsx");

async function uploadAndPreview(filename: string, buffer: Buffer) {
  const parsed = filename.endsWith(".xlsx")
    ? await parseXlsx(buffer)
    : parseCsv(buffer.toString("utf-8"));
  const { mapping } = autoMapHeaders(parsed.headers);
  const rows = await validateRows(parsed.rows, mapping);
  const batchId = await createPreviewBatch({
    filename,
    contentHash: computeContentHash(buffer),
    fileType: filename.endsWith(".xlsx") ? "xlsx" : "csv",
    mapping,
    rows,
  });
  return { batchId, rows };
}

describe("import engine (acceptance tests 6–8, 13)", () => {
  beforeEach(async () => {
    await resetDb();
    await seedProductLines();
  });

  it("imports the sample CSV with correct per-row outcomes", async () => {
    const buf = fs.readFileSync(SAMPLE_CSV);
    const { batchId, rows } = await uploadAndPreview("sample-import.csv", buf);

    // Row 9 (bad date) rejected; row 8 (99.99) flagged; last row in-file duplicate.
    const byNum = new Map(rows.map((r) => [r.rowNumber, r]));
    expect(byNum.get(9)!.outcome).toBe("FLAGGED"); // $99.99 suspicious
    expect(byNum.get(10)!.outcome).toBe("REJECTED"); // not-a-date
    expect(byNum.get(11)!.outcome).toBe("SKIPPED_DUPLICATE"); // dup of row 2

    const counts = await commitBatch(batchId);
    expect(counts.rejected).toBe(1);
    expect(counts.flagged).toBe(1);
    expect(counts.skipped).toBe(1);
    expect(counts.accepted).toBeGreaterThanOrEqual(6);

    // Stores created; flagged/rejected rows created no observations.
    const stores = await prisma.store.count();
    expect(stores).toBe(7); // FIC-001..006 (Beta counted once) + FIC-004 availability row
    const obs = await prisma.priceObservation.count();
    expect(obs).toBe(7); // rows 2,3(ultra),4,5,6(deal row),7(defaulted) + FIC-004 availability-only

    // FIC-004 ("not carried", no price) recorded as a price-less observation —
    // honest evidence, no invented price.
    const delta = await prisma.store.findFirst({ where: { name: { contains: "Delta" } } });
    const availObs = await prisma.priceObservation.findMany({ where: { storeId: delta!.id } });
    expect(availObs).toHaveLength(1);
    expect(availObs[0].priceCents).toBeNull();
    expect(availObs[0].availability).toBe("NOT_CARRIED");
    expect(availObs[0].sourceType).toBe("IMPORT");

    // Ultra price went to the ultra line, not regular (acceptance 4).
    const ultra = await prisma.productLine.findUnique({ where: { slug: "zyn-ultra" } });
    const ultraObs = await prisma.priceObservation.findMany({ where: { productLineId: ultra!.id } });
    expect(ultraObs).toHaveLength(1);
    expect(ultraObs[0].priceCents).toBe(729);

    // Unlabeled product defaulted to regular with reduced confidence + note.
    const defaulted = await prisma.priceObservation.findFirst({
      where: { priceCents: 579 },
    });
    expect(defaulted).not.toBeNull();
    expect(defaulted!.confidence).toBeLessThanOrEqual(0.6);
    expect(defaulted!.notes).toContain("not specified");

    // Deal captured.
    const deals = await prisma.quantityDeal.findMany();
    expect(deals.length).toBe(2);
    const fiveCan = deals.find((d) => d.minQty === 5)!;
    expect(fiveCan.discountPerCanCents).toBe(100);
    expect(fiveCan.appliesAboveMinQty).toBe(true);
  });

  it("is idempotent: committing the identical file twice changes nothing (acceptance 6)", async () => {
    const buf = fs.readFileSync(SAMPLE_CSV);
    const first = await uploadAndPreview("sample-import.csv", buf);
    await commitBatch(first.batchId);
    const storesBefore = await prisma.store.count();
    const obsBefore = await prisma.priceObservation.count();
    const dealsBefore = await prisma.quantityDeal.count();

    const second = await uploadAndPreview("sample-import.csv", buf);
    const counts = await commitBatch(second.batchId);
    expect(counts.accepted).toBe(0);
    expect(counts.updated).toBe(0);
    // 7 previously-applied rows + the in-file duplicate; the flagged and
    // rejected rows were never applied, so they stay flagged/rejected.
    expect(counts.skipped).toBe(8);
    expect(counts.flagged).toBe(1);
    expect(counts.rejected).toBe(1);

    expect(await prisma.store.count()).toBe(storesBefore);
    expect(await prisma.priceObservation.count()).toBe(obsBefore);
    expect(await prisma.quantityDeal.count()).toBe(dealsBefore);
  });

  it("parses and imports the XLSX template equivalently (acceptance 6)", async () => {
    const buf = fs.readFileSync(SAMPLE_XLSX);
    const { batchId } = await uploadAndPreview("sample-import.xlsx", buf);
    const counts = await commitBatch(batchId);
    expect(counts.accepted).toBeGreaterThanOrEqual(6);
    expect(counts.rejected).toBe(1);
  });

  it("matches existing stores instead of duplicating (acceptance 7)", async () => {
    const buf = fs.readFileSync(SAMPLE_CSV);
    const first = await uploadAndPreview("a.csv", buf);
    await commitBatch(first.batchId);
    const storesBefore = await prisma.store.count();

    // Same store (by external id + phone + address) with a NEW observation date.
    const csv = [
      "external_store_id,store_name,address,city,state,zip,phone,observed_at,product_line,price_usd",
      'FIC-001,Sample Mart Alpha (fictional),9001 Imaginary Ave,Chicago,IL,60614,+13125550101,2026-11-03T10:00:00-06:00,zyn,6.79',
    ].join("\n");
    const { batchId, rows } = await uploadAndPreview("b.csv", Buffer.from(csv));
    expect(rows[0].outcome).toBe("UPDATED");
    await commitBatch(batchId);
    expect(await prisma.store.count()).toBe(storesBefore); // no new store
    const alpha = await prisma.store.findFirst({ where: { name: { contains: "Alpha" } } });
    const obs = await prisma.priceObservation.findMany({
      where: { storeId: alpha!.id },
      orderBy: { observedAt: "desc" },
    });
    expect(obs).toHaveLength(2); // append-only history (acceptance 8)
    expect(obs[0].priceCents).toBe(679);
    expect(obs[1].priceCents).toBe(649);
  });

  it("flags ambiguous store matches for manual resolution (acceptance 7)", async () => {
    // Two stores share a phone number (real case: corporate Exxon line).
    const s1 = await prisma.store.create({
      data: { name: "Exxon A", address: "1 First St", phone: "+19728287250" },
    });
    const s2 = await prisma.store.create({
      data: { name: "Exxon B", address: "2 Second St", phone: "+19728287250" },
    });
    for (const s of [s1, s2]) {
      await prisma.storeIdentity.create({
        data: { storeId: s.id, kind: "PHONE", value: "+19728287250" },
      });
    }
    const csv = [
      "store_name,phone,observed_at,product_line,price_usd",
      "Exxon,+19728287250,2026-11-01T10:00:00-06:00,zyn,6.49",
    ].join("\n");
    const { rows } = await uploadAndPreview("amb.csv", Buffer.from(csv));
    expect(rows[0].outcome).toBe("FLAGGED");
    expect(rows[0].issues.some((i) => i.code === "AMBIGUOUS_STORE")).toBe(true);
  });

  it("address evidence overrides a shared phone pointing at one other store", async () => {
    const s1 = await prisma.store.create({
      data: { name: "Mobil", address: "1106 W Fullerton Ave", phone: "+17732480414" },
    });
    await prisma.storeIdentity.create({
      data: { storeId: s1.id, kind: "PHONE", value: "+17732480414" },
    });
    const s2 = await prisma.store.create({
      data: { name: "Corner Store", address: "500 Other St" },
    });
    await prisma.storeIdentity.create({
      data: { storeId: s2.id, kind: "ADDRESS", value: "500 other st" },
    });
    const csv = [
      "store_name,address,phone,observed_at,product_line,price_usd",
      "Corner Store,500 Other St,+17732480414,2026-11-01T10:00:00-06:00,zyn,6.49",
    ].join("\n");
    const { rows } = await uploadAndPreview("phone-vs-addr.csv", Buffer.from(csv));
    expect(rows[0].outcome).toBe("UPDATED");
    expect(rows[0].matchedStoreId).toBe(s2.id);
  });

  it("reversal invalidates (not deletes) evidence and keeps history traceable (acceptance 8)", async () => {
    const buf = fs.readFileSync(SAMPLE_CSV);
    const { batchId } = await uploadAndPreview("sample-import.csv", buf);
    await commitBatch(batchId);
    const obsBefore = await prisma.priceObservation.count();
    expect(obsBefore).toBeGreaterThan(0);

    await reverseBatch(batchId, "test rollback");

    expect(await prisma.priceObservation.count()).toBe(obsBefore); // nothing deleted
    expect(
      await prisma.priceObservation.count({ where: { status: "INVALIDATED" } })
    ).toBe(obsBefore);
    expect(await prisma.quantityDeal.count({ where: { status: "INVALIDATED" } })).toBe(2);
    const batch = await prisma.importBatch.findUnique({ where: { id: batchId } });
    expect(batch!.status).toBe("REVERSED");
    // Stores created solely by this batch are retired, not deleted.
    expect(await prisma.store.count({ where: { status: "RETIRED" } })).toBeGreaterThan(0);
    expect(await prisma.store.count()).toBe(7);
  });

  it("rejects malformed prices/coords and quarantines them (acceptance 7)", async () => {
    const csv = [
      "store_name,address,observed_at,product_line,price_usd,latitude,longitude",
      "Bad Price Store,1 A St,2026-11-01T10:00:00Z,zyn,six fifty,41.9,-87.6",
      "Bad Coords Store,2 B St,2026-11-01T10:00:00Z,zyn,6.49,999,-87.6",
      ",,2026-11-01T10:00:00Z,zyn,6.49,,", // no usable store identity at all
    ].join("\n");
    const { rows } = await uploadAndPreview("bad.csv", Buffer.from(csv));
    expect(rows[0].outcome).toBe("REJECTED");
    expect(rows[1].outcome).toBe("REJECTED");
    expect(rows[2].outcome).toBe("REJECTED");
  });

  it("imports free-text hours onto new and existing stores", async () => {
    const csv = [
      "store_name,address,observed_at,product_line,price_usd,hours",
      'Hours Store,1 A St,2026-11-01T10:00:00Z,zyn,6.49,"Mon-Sat 6am-11pm"',
    ].join("\n");
    const { batchId } = await uploadAndPreview("hours.csv", Buffer.from(csv));
    await commitBatch(batchId);
    const store = await prisma.store.findFirst({ where: { name: "Hours Store" } });
    expect(store!.hours).toBe("Mon-Sat 6am-11pm");

    // Enrichment on update, never blanking out.
    const csv2 = [
      "store_name,address,observed_at,product_line,price_usd,hours",
      'Hours Store,1 A St,2026-11-02T10:00:00Z,zyn,6.59,"Mon-Sun 6am-10pm"',
      // a later row without hours must not clear them
    ].join("\n");
    const { batchId: b2 } = await uploadAndPreview("hours2.csv", Buffer.from(csv2));
    await commitBatch(b2);
    const after = await prisma.store.findFirst({ where: { name: "Hours Store" } });
    expect(after!.hours).toBe("Mon-Sun 6am-10pm");
  });

  it("flags fact-free rows instead of silently creating empty stores", async () => {
    const csv = [
      "store_name,address,observed_at,product_line,price_usd,availability",
      "Factless Store,1 A St,2026-11-01T10:00:00Z,zyn,,", // no price, no availability, no deal
      "Availability Store,2 B St,2026-11-01T10:00:00Z,zyn,,not_carried", // availability-only: fine
    ].join("\n");
    const { batchId, rows } = await uploadAndPreview("factless.csv", Buffer.from(csv));
    expect(rows[0].outcome).toBe("FLAGGED");
    expect(rows[0].issues.some((i) => i.code === "NO_FACTS")).toBe(true);
    expect(rows[1].outcome).toBe("ACCEPTED");

    await commitBatch(batchId);
    // Flagged row applied nothing; availability-only row recorded evidence.
    expect(await prisma.store.count()).toBe(1);
    const o = await prisma.priceObservation.findFirst();
    expect(o!.priceCents).toBeNull();
    expect(o!.availability).toBe("NOT_CARRIED");
  });

  it("dedupes identical rows but keeps rows that differ only in availability", async () => {
    const csv = [
      "store_name,address,observed_at,product_line,price_usd,availability",
      "Same Store,1 A St,2026-11-01T10:00:00Z,zyn,,out_of_stock",
      "Same Store,1 A St,2026-11-01T10:00:00Z,zyn,,out_of_stock", // true duplicate
      "Same Store,1 A St,2026-11-01T10:00:00Z,zyn,,in_stock", // availability correction
    ].join("\n");
    const { rows } = await uploadAndPreview("avail-dup.csv", Buffer.from(csv));
    expect(rows[0].outcome).toBe("ACCEPTED");
    expect(rows[1].outcome).toBe("SKIPPED_DUPLICATE");
    expect(rows[2].outcome).not.toBe("SKIPPED_DUPLICATE");
  });

  it("unknown product lines are rejected, never guessed (acceptance 7)", async () => {
    const csv = [
      "store_name,address,observed_at,product_line,price_usd",
      "Store X,1 A St,2026-11-01T10:00:00Z,zyn-mega,6.49",
    ].join("\n");
    const { rows } = await uploadAndPreview("unknown-product.csv", Buffer.from(csv));
    expect(rows[0].outcome).toBe("REJECTED");
    expect(rows[0].issues.some((i) => i.code === "UNKNOWN_PRODUCT")).toBe(true);
  });
});
