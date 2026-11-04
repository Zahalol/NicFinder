// Security & reliability hardening tests:
//  - publishDispute/commitBatch/reverseBatch concurrency (no double effects)
//  - comment report per-user dedupe (no single-user auto-hide)
//  - optional quantity validation
import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { resetDb, seedProductLines, makeUser } from "./helpers";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { publishDispute } from "@/lib/reputation";
import { reportComment } from "@/lib/comments";
import { parseOptionalQty, csvCell, cleanText } from "@/lib/validate";
import {
  validateRows,
  createPreviewBatch,
  commitBatch,
  reverseBatch,
  computeContentHash,
  BatchStateError,
} from "@/lib/import/engine";
import { parseCsv } from "@/lib/import/parse";
import { autoMapHeaders } from "@/lib/import/contract";

const S = DEFAULT_SETTINGS;
const SAMPLE_CSV = path.join(process.cwd(), "sample-data", "sample-import.csv");

async function setupProposal() {
  const { zyn } = await seedProductLines();
  const store = await prisma.store.create({ data: { name: "Race-Store" } });
  const obs = await prisma.priceObservation.create({
    data: {
      storeId: store.id,
      productLineId: zyn.id,
      priceCents: 649,
      observedAt: new Date(),
      sourceType: "IMPORT",
    },
  });
  const proposer = await makeUser({ email: "proposer@x.com" });
  const proposal = await prisma.contribution.create({
    data: {
      userId: proposer.id,
      storeId: store.id,
      productLineId: zyn.id,
      kind: "DISPUTE",
      proposedPriceCents: 699,
      status: "CORROBORATING",
    },
  });
  return { zyn, store, obs, proposer, proposal };
}

describe("publishDispute is publish-once", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("second sequential publish is a no-op (no duplicate observation / reputation)", async () => {
    const { store, proposer, proposal } = await setupProposal();

    expect(await publishDispute(proposal.id, "corroborated")).toBe("published");
    expect(await publishDispute(proposal.id, "corroborated")).toBe("already-resolved");

    const activeObs = await prisma.priceObservation.findMany({
      where: { storeId: store.id, status: "ACTIVE" },
    });
    expect(activeObs).toHaveLength(1);
    expect(activeObs[0].priceCents).toBe(699);

    const after = await prisma.user.findUnique({ where: { id: proposer.id } });
    expect(after!.reputation).toBe(5); // exactly one +5, not two

    const events = await prisma.reputationEvent.count({
      where: { userId: proposer.id, reason: "CONTRIBUTION_PUBLISHED" },
    });
    expect(events).toBe(1);
  });

  it("concurrent publishes: exactly one wins", async () => {
    const { store, proposer, proposal } = await setupProposal();

    const results = await Promise.allSettled([
      publishDispute(proposal.id, "corroborated"),
      publishDispute(proposal.id, "corroborated"),
      publishDispute(proposal.id, "corroborated"),
    ]);
    const published = results.filter(
      (r) => r.status === "fulfilled" && r.value === "published"
    );
    expect(published).toHaveLength(1);

    const activeObs = await prisma.priceObservation.count({
      where: { storeId: store.id, status: "ACTIVE" },
    });
    expect(activeObs).toBe(1);
    const after = await prisma.user.findUnique({ where: { id: proposer.id } });
    expect(after!.reputation).toBe(5);
  });

  it("an outdated proposal cannot shadow a NEWER observation", async () => {
    const { zyn, store, proposal } = await setupProposal();
    // A fresh price arrives AFTER the proposal was opened (import/admin).
    await prisma.priceObservation.create({
      data: {
        storeId: store.id,
        productLineId: zyn.id,
        priceCents: 629,
        observedAt: new Date(Date.now() + 1000),
        sourceType: "ADMIN",
      },
    });

    expect(await publishDispute(proposal.id, "corroborated")).toBe("outdated");

    const c = await prisma.contribution.findUnique({ where: { id: proposal.id } });
    expect(c!.status).toBe("REJECTED"); // resolved as outdated, no publish
    const active = await prisma.priceObservation.findMany({
      where: { storeId: store.id, status: "ACTIVE" },
      orderBy: { observedAt: "desc" },
    });
    expect(active[0].priceCents).toBe(629); // newer price survives
    expect(active.some((o) => o.priceCents === 699)).toBe(false);
  });

  it("a published contribution cannot be re-resolved", async () => {
    const { proposal } = await setupProposal();
    await publishDispute(proposal.id, "corroborated");
    const c = await prisma.contribution.findUnique({ where: { id: proposal.id } });
    expect(c!.status).toBe("PUBLISHED");
    // publishing again (e.g. moderator approving a stale queue entry) is refused
    expect(await publishDispute(proposal.id, "moderator", "mod-id")).toBe("already-resolved");
  });
});

describe("import batch lifecycle is transition-once", () => {
  beforeEach(async () => {
    await resetDb();
    await seedProductLines();
  });

  async function previewSampleBatch() {
    const buf = fs.readFileSync(SAMPLE_CSV);
    const parsed = parseCsv(buf.toString("utf-8"));
    const { mapping } = autoMapHeaders(parsed.headers);
    const rows = await validateRows(parsed.rows, mapping);
    return createPreviewBatch({
      filename: "sample-import.csv",
      contentHash: computeContentHash(buf),
      fileType: "csv",
      mapping,
      rows,
    });
  }

  it("double sequential commit throws BatchStateError and creates nothing extra", async () => {
    const batchId = await previewSampleBatch();
    await commitBatch(batchId);
    const obsAfterFirst = await prisma.priceObservation.count();
    const storesAfterFirst = await prisma.store.count();

    await expect(commitBatch(batchId)).rejects.toBeInstanceOf(BatchStateError);

    expect(await prisma.priceObservation.count()).toBe(obsAfterFirst);
    expect(await prisma.store.count()).toBe(storesAfterFirst);
  });

  it("concurrent commits: exactly one succeeds, no duplicate data", async () => {
    const batchId = await previewSampleBatch();
    const results = await Promise.allSettled([
      commitBatch(batchId),
      commitBatch(batchId),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled");
    expect(ok).toHaveLength(1);

    // Every accepted/updated row produced at most one observation.
    const rows = await prisma.importRow.findMany({
      where: { batchId, outcome: { in: ["ACCEPTED", "UPDATED"] } },
    });
    for (const row of rows) {
      const n = await prisma.priceObservation.count({ where: { importRowId: row.id } });
      expect(n).toBeLessThanOrEqual(1);
    }
  });

  it("multiple rows describing the same NEW store create ONE store", async () => {
    const rows = [
      { store_name: "Dup Mart", address: "500 W Same St", city: "Chicago", observed_at: "2026-11-01", product_line: "zyn", price_usd: "6.49" },
      // Second row adds a phone the first row didn't carry — it must land
      // in StoreIdentity so future imports keyed on it match this store.
      { store_name: "Dup Mart", address: "500 W Same St", city: "Chicago", phone: "3125559999", observed_at: "2026-11-02", product_line: "zyn", price_usd: "6.99" },
    ];
    const mapping = Object.fromEntries(
      [...new Set(rows.flatMap((r) => Object.keys(r)))].map((k) => [k, k])
    ) as Parameters<typeof validateRows>[1];
    const validated = await validateRows(rows as Record<string, unknown>[], mapping);
    const batchId = await createPreviewBatch({
      filename: "dup-store.csv",
      contentHash: computeContentHash(Buffer.from(JSON.stringify(rows))),
      fileType: "csv",
      mapping,
      rows: validated,
    });
    await commitBatch(batchId);

    const stores = await prisma.store.findMany({ where: { name: "Dup Mart" } });
    expect(stores).toHaveLength(1);
    const obs = await prisma.priceObservation.findMany({
      where: { storeId: stores[0].id },
      orderBy: { observedAt: "asc" },
    });
    expect(obs).toHaveLength(2);
    expect(obs.map((o) => o.priceCents)).toEqual([649, 699]);

    const phoneIdent = await prisma.storeIdentity.findFirst({
      where: { storeId: stores[0].id, kind: "PHONE", value: "+13125559999" },
    });
    expect(phoneIdent).not.toBeNull();
  });

  it("concurrent commits of two identical-content batches apply the data once", async () => {
    const buf = fs.readFileSync(SAMPLE_CSV);
    const parsed = parseCsv(buf.toString("utf-8"));
    const { mapping } = autoMapHeaders(parsed.headers);
    const makeBatch = async () =>
      createPreviewBatch({
        filename: "same-content.csv",
        contentHash: computeContentHash(buf),
        fileType: "csv",
        mapping,
        rows: await validateRows(parsed.rows, mapping),
      });
    const [a, b] = [await makeBatch(), await makeBatch()];

    const results = await Promise.allSettled([commitBatch(a), commitBatch(b)]);
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);

    const batches = await prisma.importBatch.findMany({ where: { id: { in: [a, b] } } });
    expect(batches.every((x) => x.status === "COMMITTED")).toBe(true);
    const applied = batches.map((x) => x.acceptedRows + x.updatedRows).sort((x, y) => x - y);
    expect(applied[0]).toBe(0); // loser skipped everything
    expect(applied[1]).toBeGreaterThan(0); // winner applied once

    // No duplicated observations: each distinct rowHash produced at most one.
    const obsCount = await prisma.priceObservation.count();
    const winner = batches.find((x) => x.acceptedRows + x.updatedRows > 0)!;
    expect(obsCount).toBe(
      await prisma.priceObservation.count({
        where: { importRow: { batchId: winner.id } },
      })
    );
  });

  it("double reverse throws BatchStateError", async () => {
    const batchId = await previewSampleBatch();
    await commitBatch(batchId);
    await reverseBatch(batchId, "test reverse");
    await expect(reverseBatch(batchId, "again")).rejects.toBeInstanceOf(BatchStateError);
  });
});

describe("reverse + re-import recovers cleanly (no retired-store matching)", () => {
  beforeEach(async () => {
    await resetDb();
    await seedProductLines();
  });

  it("after a reversal, re-importing attaches evidence to NEW ACTIVE stores", async () => {
    const buf = fs.readFileSync(SAMPLE_CSV);
    const parsed = parseCsv(buf.toString("utf-8"));
    const { mapping } = autoMapHeaders(parsed.headers);
    const preview = async () =>
      createPreviewBatch({
        filename: "sample-import.csv",
        contentHash: computeContentHash(buf),
        fileType: "csv",
        mapping,
        rows: await validateRows(parsed.rows, mapping),
      });

    const first = await preview();
    await commitBatch(first);
    await reverseBatch(first, "bad data");
    const retired = await prisma.store.count({ where: { status: "RETIRED" } });
    expect(retired).toBeGreaterThan(0);

    // The corrected (here: identical) file re-imports fresh.
    const second = await preview();
    const counts = await commitBatch(second);
    expect(counts.accepted).toBeGreaterThan(0);

    // Every live observation hangs off an ACTIVE store — nothing attached
    // to the retired ghosts, and no observation is lost to them.
    const activeObs = await prisma.priceObservation.findMany({
      where: { status: "ACTIVE" },
      include: { store: { select: { status: true } } },
    });
    expect(activeObs.length).toBeGreaterThan(0);
    for (const o of activeObs) expect(o.store.status).toBe("ACTIVE");
  });
});

describe("deal field bounds", () => {
  beforeEach(async () => {
    await resetDb();
    await seedProductLines();
  });

  const validateOne = async (row: Record<string, unknown>) => {
    const mapping = Object.fromEntries(
      Object.keys(row).map((k) => [k, k])
    ) as Parameters<typeof validateRows>[1];
    return (await validateRows([row], mapping))[0];
  };

  const base = {
    store_name: "Deal Mart",
    address: "77 Deal St",
    observed_at: "2026-11-01",
    product_line: "zyn",
    price_usd: "6.49",
  };

  it("accepts a FUTURE deal expiry (deals must actually expire)", async () => {
    const r = await validateOne({
      ...base,
      deal_min_qty: 5,
      deal_price_per_can_usd: "5.99",
      deal_expires_at: "2026-12-31",
    });
    expect(r.outcome).toBe("ACCEPTED");
    expect(r.deal?.expiresAt).toBeInstanceOf(Date);
    expect(r.issues.some((i) => i.code === "BAD_DEAL_EXPIRY")).toBe(false);
  });

  it("rejects implausible expiry, zero-dollar deals, and absurd quantities", async () => {
    const badExpiry = await validateOne({
      ...base,
      deal_min_qty: 5,
      deal_price_per_can_usd: "5.99",
      deal_expires_at: "2099-01-01",
    });
    expect(badExpiry.outcome).toBe("REJECTED");

    const freeDeal = await validateOne({
      ...base,
      deal_min_qty: 5,
      deal_price_per_can_usd: "0.00",
    });
    expect(freeDeal.outcome).toBe("REJECTED");

    const hugeQty = await validateOne({
      ...base,
      deal_min_qty: 10_000_000_000,
      deal_price_per_can_usd: "5.99",
    });
    expect(hugeQty.outcome).toBe("REJECTED");
  });
});

describe("comment reports are per-user deduped", () => {
  beforeEach(async () => {
    await resetDb();
  });

  async function setupComment() {
    const store = await prisma.store.create({ data: { name: "C-Store" } });
    const author = await makeUser({ email: "author@x.com" });
    const comment = await prisma.comment.create({
      data: { storeId: store.id, userId: author.id, body: "Prices went up." },
    });
    return { store, author, comment };
  }

  it("one user reporting N times cannot auto-hide a comment", async () => {
    const { comment } = await setupComment();
    const reporter = await makeUser({ email: "r1@x.com" });

    for (let i = 0; i < 5; i++) {
      const res = await reportComment(comment.id, reporter.id, S);
      expect(res.ok).toBe(true);
    }
    const after = await prisma.comment.findUnique({ where: { id: comment.id } });
    expect(after!.status).toBe("VISIBLE");
    expect(after!.reportCount).toBe(1);
  });

  it("distinct reporters reaching the threshold auto-hide the comment", async () => {
    const { comment } = await setupComment();
    for (let i = 0; i < S.autoHideReportCount; i++) {
      const reporter = await makeUser({ email: `rep${i}@x.com` });
      const res = await reportComment(comment.id, reporter.id, S);
      expect(res.ok).toBe(true);
    }
    const after = await prisma.comment.findUnique({ where: { id: comment.id } });
    expect(after!.status).toBe("HIDDEN");
    expect(after!.reportCount).toBe(S.autoHideReportCount);
  });

  it("authors cannot report their own comments", async () => {
    const { author, comment } = await setupComment();
    const res = await reportComment(comment.id, author.id, S);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(400);
  });

  it("hidden comments cannot keep accumulating reports", async () => {
    const { comment } = await setupComment();
    await prisma.comment.update({ where: { id: comment.id }, data: { status: "HIDDEN" } });
    const reporter = await makeUser({ email: "late@x.com" });
    const res = await reportComment(comment.id, reporter.id, S);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(404);
  });
});

describe("csvCell — formula-injection-safe CSV encoding", () => {
  it("neutralizes leading formula characters", () => {
    expect(csvCell("=HYPERLINK(evil)")).toBe("'=HYPERLINK(evil)");
    expect(csvCell("+1+1")).toBe("'+1+1");
    expect(csvCell("-2")).toBe("'-2");
    expect(csvCell("@cmd")).toBe("'@cmd");
  });
  it("quotes separators and preserves ordinary values", () => {
    expect(csvCell('say "hi", ok')).toBe('"say ""hi"", ok"');
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell(6.49)).toBe("6.49");
    expect(csvCell(null)).toBe("");
  });
  it("quotes injected-then-separator combinations", () => {
    expect(csvCell("=1,2")).toBe("\"'=1,2\"");
  });
});

describe("import field-length bounds", () => {
  beforeEach(async () => {
    await resetDb();
    await seedProductLines();
  });

  it("rejects rows with absurdly long fields", async () => {
    const rows = [
      {
        store_name: "A".repeat(500),
        address: "1 Main St",
        observed_at: "2026-11-01",
        product_line: "zyn",
        price_usd: "6.49",
      },
    ];
    const mapping = Object.fromEntries(
      Object.keys(rows[0]).map((k) => [k, k])
    ) as Parameters<typeof validateRows>[1];
    const validated = await validateRows(rows as Record<string, unknown>[], mapping);
    expect(validated[0].outcome).toBe("REJECTED");
    expect(validated[0].issues.some((i) => i.code === "FIELD_TOO_LONG")).toBe(true);
  });
});

describe("import validation never throws on garbage (fuzz)", () => {
  beforeEach(async () => {
    await resetDb();
    await seedProductLines();
  });

  it("classifies 200 adversarial rows without crashing", async () => {
    const junkPool: unknown[] = [
      null, undefined, "", " ", 0, -1, 1e300, -1e300, NaN, Infinity, -Infinity,
      "NaN", "null", "undefined", "'; DROP TABLE stores;--", "=HYPERLINK(\"x\")",
      "\u0000\u0001\u0002", "💀".repeat(50), "a".repeat(5000), "9".repeat(400),
      "-5.99", "5.999", "1e9", "0x41", "2026-13-45", "not-a-date",
      "99999-01-01", { nested: "object" }, [1, 2, 3], true, false,
      "+1312555", "312", "90", "-91", "181", "-200",
    ];
    const fields = [
      "external_store_id", "store_name", "address", "city", "state", "zip",
      "latitude", "longitude", "phone", "observed_at", "product_line",
      "price_usd", "currency", "tax_included", "availability", "confidence",
      "deal_min_qty", "deal_price_per_can_usd", "deal_discount_per_can_usd",
      "deal_applies_above_min_qty", "deal_conditions", "deal_expires_at",
      "notes",
    ];
    // Deterministic pseudo-random so failures are reproducible.
    let seed = 42;
    const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    const rows: Record<string, unknown>[] = [];
    for (let i = 0; i < 200; i++) {
      const row: Record<string, unknown> = {};
      for (const f of fields) {
        if (rand() < 0.7) row[f] = junkPool[Math.floor(rand() * junkPool.length)];
      }
      rows.push(row);
    }
    const mapping = Object.fromEntries(fields.map((f) => [f, f])) as Parameters<
      typeof validateRows
    >[1];

    const validated = await validateRows(rows, mapping);
    expect(validated).toHaveLength(200);
    const valid = new Set(["ACCEPTED", "UPDATED", "SKIPPED_DUPLICATE", "FLAGGED", "REJECTED"]);
    for (const r of validated) {
      expect(valid.has(r.outcome)).toBe(true);
      // Issues must serialize (they go into the DB as JSON verbatim).
      expect(() => JSON.stringify(r.issues)).not.toThrow();
    }
  });
});

describe("cleanText", () => {
  it("strips NUL and control characters (Postgres text rejects \\0)", () => {
    expect(cleanText("a\u0000b", 100)).toBe("ab");
    expect(cleanText("x\u0007\u001b[31my", 100)).toBe("x[31my");
    expect(cleanText("keep\nnewlines\tand tabs", 100)).toBe("keep\nnewlines\tand tabs");
  });
  it("trims and caps length", () => {
    expect(cleanText("  hi  ", 100)).toBe("hi");
    expect(cleanText("a".repeat(600), 500)).toHaveLength(500);
    expect(cleanText(null, 10)).toBe("");
    expect(cleanText(12345, 3)).toBe("123");
  });
});

describe("parseOptionalQty", () => {
  it("accepts absent values as null", () => {
    expect(parseOptionalQty(undefined)).toBeNull();
    expect(parseOptionalQty(null)).toBeNull();
    expect(parseOptionalQty("")).toBeNull();
  });
  it("accepts sane integers (number or numeric string)", () => {
    expect(parseOptionalQty(5)).toBe(5);
    expect(parseOptionalQty("10")).toBe(10);
    expect(parseOptionalQty(1)).toBe(1);
    expect(parseOptionalQty(100)).toBe(100);
  });
  it("rejects NaN, floats, negatives, zero, and huge values", () => {
    expect(parseOptionalQty("abc")).toBeUndefined();
    expect(parseOptionalQty(2.5)).toBeUndefined();
    expect(parseOptionalQty(-1)).toBeUndefined();
    expect(parseOptionalQty(0)).toBeUndefined();
    expect(parseOptionalQty(101)).toBeUndefined();
    expect(parseOptionalQty(Infinity)).toBeUndefined();
    expect(parseOptionalQty("1e3")).toBeUndefined();
  });
});
