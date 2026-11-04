// Import engine: validate canonical rows, match stores, preview, commit,
// reverse. Append-only: committing creates observations; reversing
// invalidates them (never deletes).

import { createHash } from "node:crypto";
import { prisma } from "../db";
import { parsePriceToCents } from "../money";
import { normalizePhone, normalizeAddress, nameSimilarity, splitUsAddress } from "../normalize";
import { metersBetween } from "../geo";
import { audit } from "../audit";
import {
  type CanonicalField,
  type CanonicalRow,
  AVAILABILITY_VALUES,
  parseBool,
} from "./contract";
export interface RowIssue {
  code: string;
  field?: string;
  message: string;
}

export type RowOutcome =
  | "ACCEPTED"
  | "UPDATED"
  | "SKIPPED_DUPLICATE"
  | "FLAGGED"
  | "REJECTED";

export interface ValidatedRow {
  rowNumber: number;
  raw: Record<string, unknown>;
  canonical: CanonicalRow;
  issues: RowIssue[];
  outcome: RowOutcome;
  rowHash: string;
  matchedStoreId: string | null;
  matchKind: "external_id" | "phone" | "address" | "coords" | "new" | "ambiguous" | null;
  priceCents: number | null;
  observedAt: Date | null;
  productLineId: string | null;
  deal: {
    minQty: number;
    pricePerCanCents: number | null;
    discountPerCanCents: number | null;
    appliesAboveMinQty: boolean | null;
    conditions: string | null;
    expiresAt: Date | null;
  } | null;
}

// --- canonicalization -------------------------------------------------------

export function toCanonical(
  raw: Record<string, unknown>,
  mapping: Record<string, CanonicalField | null>
): CanonicalRow {
  const c: Record<string, unknown> = {};
  for (const [header, field] of Object.entries(mapping)) {
    if (!field) continue;
    const v = raw[header];
    c[field] = v === undefined || v === "" ? null : v;
  }
  const num = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  // Defensive string handling for hostile/garbled files:
  //  - strip C0/C1 control chars (incl. NUL, which Postgres text rejects),
  //    keeping tab/newline inside multi-line cells out (collapsed by trim
  //    where relevant), and cap length per field so a 1 MB cell can't bloat
  //    the DB or the admin UI.
  const str = (v: unknown, max = 500): string | null => {
    if (v === null || v === undefined) return null;
    const cleaned = String(v).replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, "").trim();
    return cleaned === "" ? null : cleaned.slice(0, max);
  };

  return {
    external_store_id: str(c.external_store_id, 120),
    store_name: str(c.store_name, 160),
    address: str(c.address, 250),
    city: str(c.city, 80),
    state: str(c.state, 40)?.toUpperCase() ?? null,
    zip: str(c.zip, 20)?.slice(0, 5) ?? null,
    latitude: num(c.latitude),
    longitude: num(c.longitude),
    phone: str(c.phone, 40),
    observed_at: str(c.observed_at, 60),
    product_line: str(c.product_line, 60)?.toLowerCase().replace(/[\s_]+/g, "-") ?? null,
    price_usd: (c.price_usd as string | number | null) ?? null,
    currency: str(c.currency, 10)?.toUpperCase() ?? null,
    tax_included: parseBool(c.tax_included),
    availability: str(c.availability, 40),
    confidence: num(c.confidence),
    strength: str(c.strength, 60),
    flavor: str(c.flavor, 80),
    can_size: str(c.can_size, 60),
    deal_min_qty: num(c.deal_min_qty),
    deal_price_per_can_usd: (c.deal_price_per_can_usd as string | number | null) ?? null,
    deal_discount_per_can_usd:
      (c.deal_discount_per_can_usd as string | number | null) ?? null,
    deal_applies_above_min_qty: parseBool(c.deal_applies_above_min_qty),
    deal_conditions: str(c.deal_conditions, 300),
    deal_expires_at: str(c.deal_expires_at, 60),
    source_row_id: str(c.source_row_id, 120),
    call_id: str(c.call_id, 120),
    notes: str(c.notes, 1000),
  };
}

function parseDate(v: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  // Reject absurd dates
  if (d.getFullYear() < 2000 || d.getTime() > Date.now() + 86400_000) return null;
  return d;
}

/** Stable content hash of the observation-identity of a row (cross-batch dedupe). */
export function computeRowHash(c: CanonicalRow): string {
  const identity = [
    c.external_store_id ?? "",
    normalizePhone(c.phone) ?? "",
    normalizeAddress(c.address) ?? "",
    (c.store_name ?? "").toLowerCase().trim(),
    c.observed_at ?? "",
    c.product_line ?? "",
    String(c.price_usd ?? ""),
    (c.availability ?? "").toLowerCase().trim(),
    String(c.deal_min_qty ?? ""),
    String(c.deal_price_per_can_usd ?? ""),
    String(c.deal_discount_per_can_usd ?? ""),
  ].join("|");
  return createHash("sha256").update(identity).digest("hex");
}

export function computeContentHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

// --- store matching ---------------------------------------------------------

interface StoreLite {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  status: string;
}

export interface MatchContext {
  byExternalId: Map<string, string>; // identity value -> storeId
  byPhone: Map<string, string[]>;
  byAddress: Map<string, string[]>;
  stores: StoreLite[];
}

export async function buildMatchContext(source?: string): Promise<MatchContext> {
  const identities = await prisma.storeIdentity.findMany({
    select: { kind: true, value: true, storeId: true, source: true },
  });
  const byExternalId = new Map<string, string>();
  const byPhone = new Map<string, string[]>();
  const byAddress = new Map<string, string[]>();
  for (const i of identities) {
    if (i.kind === "EXTERNAL_ID" && (!source || i.source === source || !i.source)) {
      byExternalId.set(i.value, i.storeId);
    } else if (i.kind === "PHONE") {
      byPhone.set(i.value, [...(byPhone.get(i.value) ?? []), i.storeId]);
    } else if (i.kind === "ADDRESS") {
      byAddress.set(i.value, [...(byAddress.get(i.value) ?? []), i.storeId]);
    }
  }
  const stores = await prisma.store.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      address: true,
      latitude: true,
      longitude: true,
      phone: true,
      status: true,
    },
  });
  return { byExternalId, byPhone, byAddress, stores };
}

const COORD_MATCH_METERS = 75;
const NAME_SIM_THRESHOLD = 0.4;

export function matchStore(
  c: CanonicalRow,
  ctx: MatchContext
): { storeId: string | null; kind: ValidatedRow["matchKind"]; candidates: string[] } {
  // 1. External ID — authoritative.
  if (c.external_store_id) {
    const id = ctx.byExternalId.get(c.external_store_id);
    if (id) return { storeId: id, kind: "external_id", candidates: [id] };
  }
  // 2. Phone — strong but not unique in practice (shared numbers in the
  //    source data!), so require name/address compatibility when multiple.
  const phone = normalizePhone(c.phone);
  if (phone) {
    const ids = [...new Set(ctx.byPhone.get(phone) ?? [])];
    if (ids.length === 1) {
      // Shared corporate lines exist: if the row carries an address that
      // clearly belongs to a DIFFERENT known store, don't trust the phone.
      const rowAddr = normalizeAddress(c.address);
      if (rowAddr) {
        const matched = ctx.stores.find((s) => s.id === ids[0]);
        const matchedAddr = matched ? normalizeAddress(matched.address) : null;
        if (matchedAddr && rowAddr !== matchedAddr) {
          const addrIds = [...new Set(ctx.byAddress.get(rowAddr) ?? [])];
          if (addrIds.length === 1 && addrIds[0] !== ids[0]) {
            return { storeId: addrIds[0], kind: "address", candidates: addrIds };
          }
          if (addrIds.length === 0) {
            // Unknown address + known phone that points elsewhere → ambiguous.
            return { storeId: null, kind: "ambiguous", candidates: ids };
          }
        }
      }
      return { storeId: ids[0], kind: "phone", candidates: ids };
    }
    if (ids.length > 1) {
      // Disambiguate by address
      const addr = normalizeAddress(c.address);
      if (addr) {
        const byAddr = ids.filter((id) => {
          const s = ctx.stores.find((st) => st.id === id);
          return s && normalizeAddress(s.address) === addr;
        });
        if (byAddr.length === 1)
          return { storeId: byAddr[0], kind: "phone", candidates: byAddr };
      }
      return { storeId: null, kind: "ambiguous", candidates: ids };
    }
  }
  // 3. Normalized address.
  const addr = normalizeAddress(c.address);
  if (addr) {
    const ids = [...new Set(ctx.byAddress.get(addr) ?? [])];
    if (ids.length === 1) return { storeId: ids[0], kind: "address", candidates: ids };
    if (ids.length > 1) return { storeId: null, kind: "ambiguous", candidates: ids };
  }
  // 4. Coordinates within 75m + similar-enough name (cautious fuzzy match).
  if (c.latitude !== null && c.longitude !== null) {
    const nearby = ctx.stores.filter(
      (s) =>
        s.latitude !== null &&
        s.longitude !== null &&
        metersBetween(c.latitude!, c.longitude!, s.latitude, s.longitude) <=
          COORD_MATCH_METERS
    );
    if (nearby.length) {
      if (!c.store_name) {
        return nearby.length === 1
          ? { storeId: nearby[0].id, kind: "coords", candidates: [nearby[0].id] }
          : { storeId: null, kind: "ambiguous", candidates: nearby.map((s) => s.id) };
      }
      const scored = nearby
        .map((s) => ({ s, sim: nameSimilarity(c.store_name!, s.name) }))
        .sort((a, b) => b.sim - a.sim);
      if (scored[0].sim >= NAME_SIM_THRESHOLD) {
        if (scored.length > 1 && scored[1].sim >= NAME_SIM_THRESHOLD) {
          return {
            storeId: null,
            kind: "ambiguous",
            candidates: scored.filter((x) => x.sim >= NAME_SIM_THRESHOLD).map((x) => x.s.id),
          };
        }
        return { storeId: scored[0].s.id, kind: "coords", candidates: [scored[0].s.id] };
      }
      // Nearby but dissimilar name: could be a second store at the same
      // corner — create new but flag as possible duplicate downstream.
      return { storeId: null, kind: "new", candidates: nearby.map((s) => s.id) };
    }
  }
  return { storeId: null, kind: "new", candidates: [] };
}

// --- validation ---------------------------------------------------------

export async function validateRows(
  rawRows: Record<string, unknown>[],
  mapping: Record<string, CanonicalField | null>,
  opts: { source?: string } = {}
): Promise<ValidatedRow[]> {
  const productLines = await prisma.productLine.findMany({
    where: { active: true },
  });
  const slugById = new Map(productLines.map((p) => [p.slug, p.id]));
  const defaultLine = productLines.find((p) => p.slug === "zyn") ?? productLines[0];

  const committedHashes = new Set(
    (
      await prisma.importRow.findMany({
        where: {
          outcome: { in: ["ACCEPTED", "UPDATED"] },
          batch: { status: "COMMITTED" },
        },
        select: { rowHash: true },
      })
    ).map((r) => r.rowHash)
  );

  const ctx = await buildMatchContext(opts.source);
  const seenInFile = new Set<string>();
  const out: ValidatedRow[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const c = toCanonical(raw, mapping);
    const issues: RowIssue[] = [];
    const rowHash = computeRowHash(c);

    // --- field validation
    const priceCents = parsePriceToCents(c.price_usd);
    if (c.price_usd !== null && priceCents === null)
      issues.push({ code: "BAD_PRICE", field: "price_usd", message: `Unparseable price: ${String(c.price_usd)}` });
    if (priceCents !== null && (priceCents < 100 || priceCents > 2500))
      issues.push({ code: "PRICE_OUT_OF_RANGE", field: "price_usd", message: `Price ${priceCents}¢ outside sanity range $1.00–$25.00` });

    const observedAt = parseDate(c.observed_at);
    if (c.observed_at !== null && observedAt === null)
      issues.push({ code: "BAD_DATE", field: "observed_at", message: `Unparseable/implausible date: ${c.observed_at}` });
    if (c.observed_at === null)
      issues.push({ code: "MISSING_DATE", field: "observed_at", message: "observed_at is required for price observations" });

    if (!c.store_name && !c.external_store_id && !c.phone && !c.address)
      issues.push({ code: "NO_STORE_IDENTITY", message: "Row has no usable store identity (name/id/phone/address)" });

    if (
      (c.latitude !== null && (c.latitude < -90 || c.latitude > 90)) ||
      (c.longitude !== null && (c.longitude < -180 || c.longitude > 180))
    )
      issues.push({ code: "BAD_COORDS", message: "Latitude/longitude out of range" });

    if (c.currency && c.currency !== "USD")
      issues.push({ code: "BAD_CURRENCY", field: "currency", message: `Only USD supported (got ${c.currency})` });

    const availability = c.availability
      ? (AVAILABILITY_VALUES[c.availability.toLowerCase().trim()] ?? null)
      : "UNKNOWN";
    if (availability === null)
      issues.push({ code: "BAD_AVAILABILITY", field: "availability", message: `Unrecognized availability "${c.availability}"` });

    let productLineId: string | null = null;
    if (c.product_line) {
      productLineId = slugById.get(c.product_line) ?? null;
      if (!productLineId)
        issues.push({ code: "UNKNOWN_PRODUCT", field: "product_line", message: `Unknown product line "${c.product_line}" — must be one of: ${[...slugById.keys()].join(", ")}` });
    } else {
      // Unlabeled fact → attach to the default (regular) line; never to Ultra.
      productLineId = defaultLine?.id ?? null;
      if (priceCents !== null || (availability !== null && availability !== "UNKNOWN"))
        issues.push({ code: "PRODUCT_DEFAULTED", field: "product_line", message: `No product line given; attached to "${defaultLine?.slug}" with reduced confidence` });
    }

    if (c.confidence !== null && (c.confidence < 0 || c.confidence > 1))
      issues.push({ code: "BAD_CONFIDENCE", field: "confidence", message: "Confidence must be 0..1" });

    // A row with no price, no deal and no explicit availability asserts no
    // fact — flag it rather than silently creating an evidence-free store.
    const hasExplicitAvailability =
      availability !== null && availability !== "UNKNOWN";
    const hasAnyDealField =
      c.deal_min_qty !== null ||
      c.deal_price_per_can_usd !== null ||
      c.deal_discount_per_can_usd !== null;
    if (c.price_usd === null && !hasAnyDealField && !hasExplicitAvailability)
      issues.push({
        code: "NO_FACTS",
        message:
          "Row has no price, no deal and no explicit availability — nothing to record",
      });

    // --- deal validation
    let deal: ValidatedRow["deal"] = null;
    const hasDealField =
      c.deal_min_qty !== null ||
      c.deal_price_per_can_usd !== null ||
      c.deal_discount_per_can_usd !== null;
    if (hasDealField) {
      const dealPrice = parsePriceToCents(c.deal_price_per_can_usd);
      const dealDiscount = parsePriceToCents(c.deal_discount_per_can_usd);
      if (c.deal_min_qty === null || c.deal_min_qty < 2 || !Number.isInteger(c.deal_min_qty)) {
        issues.push({ code: "BAD_DEAL_QTY", field: "deal_min_qty", message: "Deal requires an integer deal_min_qty >= 2" });
      } else if (dealPrice === null && dealDiscount === null) {
        issues.push({ code: "BAD_DEAL_PRICE", message: "Deal requires deal_price_per_can_usd or deal_discount_per_can_usd" });
      } else if (dealPrice !== null && dealDiscount !== null) {
        issues.push({ code: "DEAL_CONFLICT", message: "Provide either deal price or deal discount, not both" });
      } else {
        const expiresAt = parseDate(c.deal_expires_at);
        if (c.deal_expires_at !== null && expiresAt === null)
          issues.push({ code: "BAD_DEAL_EXPIRY", field: "deal_expires_at", message: "Unparseable deal_expires_at" });
        deal = {
          minQty: c.deal_min_qty,
          pricePerCanCents: dealPrice,
          discountPerCanCents: dealDiscount,
          appliesAboveMinQty: c.deal_applies_above_min_qty,
          conditions: c.deal_conditions,
          expiresAt,
        };
      }
    }

    // --- outcome determination
    const fatal = issues.some((x) =>
      ["BAD_PRICE", "BAD_DATE", "MISSING_DATE", "NO_STORE_IDENTITY", "BAD_COORDS", "BAD_CURRENCY", "UNKNOWN_PRODUCT", "BAD_AVAILABILITY", "BAD_CONFIDENCE", "BAD_DEAL_QTY", "BAD_DEAL_PRICE", "DEAL_CONFLICT"].includes(x.code)
    );

    let outcome: RowOutcome;
    let matchedStoreId: string | null = null;
    let matchKind: ValidatedRow["matchKind"] = null;

    if (fatal) {
      outcome = "REJECTED";
    } else if (seenInFile.has(rowHash)) {
      outcome = "SKIPPED_DUPLICATE";
      issues.push({ code: "DUPLICATE_IN_FILE", message: "Identical row earlier in this file" });
    } else if (committedHashes.has(rowHash)) {
      outcome = "SKIPPED_DUPLICATE";
      issues.push({ code: "DUPLICATE_PRIOR_IMPORT", message: "Identical row already committed in a prior import" });
    } else {
      const match = matchStore(c, ctx);
      matchKind = match.kind;
      if (match.kind === "ambiguous") {
        outcome = "FLAGGED";
        issues.push({ code: "AMBIGUOUS_STORE", message: `Multiple candidate stores (${match.candidates.length}) — resolve manually` });
      } else if (match.storeId) {
        matchedStoreId = match.storeId;
        outcome = "UPDATED";
      } else {
        if (issues.some((x) => x.code === "PRICE_OUT_OF_RANGE")) {
          outcome = "FLAGGED";
        } else {
          outcome = "ACCEPTED"; // new store + observation
        }
      }
      if (outcome !== "FLAGGED" && issues.some((x) => x.code === "PRICE_OUT_OF_RANGE")) {
        outcome = "FLAGGED";
      }
      if (
        (outcome === "ACCEPTED" || outcome === "UPDATED") &&
        issues.some((x) => x.code === "NO_FACTS")
      ) {
        outcome = "FLAGGED";
      }
    }

    if (outcome !== "REJECTED") seenInFile.add(rowHash);

    out.push({
      rowNumber: i + 2, // 1-based + header row
      raw,
      canonical: c,
      issues,
      outcome,
      rowHash,
      matchedStoreId,
      matchKind,
      priceCents,
      observedAt,
      productLineId,
      deal,
    });
  }
  return out;
}

// --- persistence -------------------------------------------------------

export interface BatchCounts {
  total: number;
  accepted: number;
  updated: number;
  skipped: number;
  flagged: number;
  rejected: number;
}

export function countOutcomes(rows: ValidatedRow[]): BatchCounts {
  return {
    total: rows.length,
    accepted: rows.filter((r) => r.outcome === "ACCEPTED").length,
    updated: rows.filter((r) => r.outcome === "UPDATED").length,
    skipped: rows.filter((r) => r.outcome === "SKIPPED_DUPLICATE").length,
    flagged: rows.filter((r) => r.outcome === "FLAGGED").length,
    rejected: rows.filter((r) => r.outcome === "REJECTED").length,
  };
}

/** Create a PREVIEW batch with validated rows (no stores/observations yet). */
export async function createPreviewBatch(opts: {
  filename: string;
  contentHash: string;
  fileType: "csv" | "xlsx";
  mapping: Record<string, CanonicalField | null>;
  rows: ValidatedRow[];
  uploadedById?: string;
}): Promise<string> {
  const counts = countOutcomes(opts.rows);
  const batch = await prisma.importBatch.create({
    data: {
      filename: opts.filename,
      contentHash: opts.contentHash,
      fileType: opts.fileType,
      mappingJson: JSON.stringify(opts.mapping),
      status: "PREVIEW",
      uploadedById: opts.uploadedById,
      totalRows: counts.total,
      acceptedRows: counts.accepted,
      updatedRows: counts.updated,
      skippedRows: counts.skipped,
      flaggedRows: counts.flagged,
      rejectedRows: counts.rejected,
    },
  });
  // chunk row inserts to keep SQLite happy
  const chunk = 200;
  for (let i = 0; i < opts.rows.length; i += chunk) {
    await prisma.importRow.createMany({
      data: opts.rows.slice(i, i + chunk).map((r) => ({
        batchId: batch.id,
        rowNumber: r.rowNumber,
        rawJson: JSON.stringify(r.raw),
        rowHash: r.rowHash,
        outcome: r.outcome,
        issuesJson: JSON.stringify(r.issues),
        matchedStoreId: r.matchedStoreId,
      })),
    });
  }
  return batch.id;
}

/**
 * Commit a PREVIEW batch: re-validate against current DB state (stores may
 * have changed since preview), then create/update stores, observations,
 * deals, identities. Rows FLAGGED/REJECTED/SKIPPED are recorded, not applied.
 */
export async function commitBatch(
  batchId: string,
  opts: { userId?: string; source?: string } = {}
): Promise<BatchCounts> {
  const batch = await prisma.importBatch.findUniqueOrThrow({
    where: { id: batchId },
    include: { rows: { orderBy: { rowNumber: "asc" } } },
  });
  if (batch.status !== "PREVIEW") throw new Error(`Batch is ${batch.status}, not PREVIEW`);

  // Idempotency: identical file already committed → nothing to do.
  const prior = await prisma.importBatch.findFirst({
    where: { contentHash: batch.contentHash, status: "COMMITTED", id: { not: batch.id } },
  });

  const mapping = JSON.parse(batch.mappingJson) as Record<string, CanonicalField | null>;
  const rawRows = batch.rows.map((r) => JSON.parse(r.rawJson) as Record<string, unknown>);
  let validated = await validateRows(rawRows, mapping, { source: opts.source });
  if (prior) {
    validated = validated.map((r) =>
      r.outcome === "ACCEPTED" || r.outcome === "UPDATED"
        ? { ...r, outcome: "SKIPPED_DUPLICATE" as const, issues: [...r.issues, { code: "DUPLICATE_BATCH", message: "Identical file already committed" }] }
        : r
    );
  }

  const source = opts.source ?? "import";

  await prisma.$transaction(
    async (tx) => {
      for (let i = 0; i < validated.length; i++) {
        const row = validated[i];
        const dbRow = batch.rows[i];
        let storeId = row.matchedStoreId;

        if (row.outcome === "ACCEPTED" && !storeId) {
          // Create a new store
          const c = row.canonical;
          const parts = c.address ? splitUsAddress(c.address) : null;
          const store = await tx.store.create({
            data: {
              name: c.store_name ?? "Unknown store",
              address: parts?.street ?? c.address,
              city: c.city ?? parts?.city,
              state: c.state ?? parts?.state,
              zip: c.zip ?? parts?.zip,
              latitude: c.latitude,
              longitude: c.longitude,
              phone: normalizePhone(c.phone),
            },
          });
          storeId = store.id;
          // Identities for future matching
          const identities: { kind: string; value: string; source: string | null }[] = [];
          if (c.external_store_id)
            identities.push({ kind: "EXTERNAL_ID", value: c.external_store_id, source });
          const phone = normalizePhone(c.phone);
          if (phone) identities.push({ kind: "PHONE", value: phone, source: null });
          const addr = normalizeAddress(c.address);
          if (addr) identities.push({ kind: "ADDRESS", value: addr, source: null });
          // skipDuplicates (ON CONFLICT DO NOTHING) — a colliding identity
          // already maps elsewhere; never abort the batch transaction.
          if (identities.length) {
            await tx.storeIdentity.createMany({
              data: identities.map((ident) => ({ storeId: storeId!, ...ident })),
              skipDuplicates: true,
            });
          }
          // Possible-duplicate flag when created near existing stores
          if (row.matchKind === "new" && c.latitude !== null && c.longitude !== null) {
            const near = await tx.store.findMany({
              where: {
                id: { not: storeId },
                status: "ACTIVE",
                latitude: { gte: c.latitude - 0.001, lte: c.latitude + 0.001 },
                longitude: { gte: c.longitude - 0.0015, lte: c.longitude + 0.0015 },
              },
              select: { id: true },
              take: 3,
            });
            if (near.length) {
              await tx.duplicateCandidate.createMany({
                data: near.map((n) => {
                  const [a, b] = [storeId!, n.id].sort();
                  return { storeAId: a, storeBId: b, reason: "Created within ~100m of an existing store", score: 0.5 };
                }),
                skipDuplicates: true,
              });
            }
          }
        } else if (row.outcome === "UPDATED" && storeId) {
          // Enrich store with any newly supplied fields (never blank out).
          const c = row.canonical;
          const data: Record<string, unknown> = {};
          if (c.latitude !== null) data.latitude = c.latitude;
          if (c.longitude !== null) data.longitude = c.longitude;
          const phone = normalizePhone(c.phone);
          if (phone) data.phone = phone;
          if (Object.keys(data).length)
            await tx.store.update({ where: { id: storeId }, data });
          if (c.external_store_id) {
            await tx.storeIdentity.createMany({
              data: [{ storeId, kind: "EXTERNAL_ID", value: c.external_store_id, source }],
              skipDuplicates: true,
            });
          }
        }

        // Create observation + deal for applied rows with a price
        if ((row.outcome === "ACCEPTED" || row.outcome === "UPDATED") && storeId) {
          const c = row.canonical;
          if (row.priceCents !== null && row.observedAt && row.productLineId) {
            const defaulted = row.issues.some((x) => x.code === "PRODUCT_DEFAULTED");
            await tx.priceObservation.create({
              data: {
                storeId,
                productLineId: row.productLineId,
                priceCents: row.priceCents,
                taxIncluded: c.tax_included,
                availability: AVAILABILITY_VALUES[c.availability?.toLowerCase().trim() ?? ""] ?? "UNKNOWN",
                strength: c.strength,
                flavor: c.flavor,
                canSize: c.can_size,
                observedAt: row.observedAt,
                sourceType: "IMPORT",
                confidence: defaulted ? Math.min(c.confidence ?? 0.6, 0.6) : c.confidence,
                importRowId: dbRow.id,
                externalCallId: c.call_id,
                notes: defaulted
                  ? [c.notes, "Product line not specified in source; attached to regular line."].filter(Boolean).join(" ")
                  : c.notes,
              },
            });
          } else if (row.observedAt && row.productLineId && c.availability) {
            // Availability-only rows (e.g. "not carried") record evidence as a
            // price-less observation — we never invent a price for them.
            const avail = AVAILABILITY_VALUES[c.availability.toLowerCase().trim()];
            if (avail && avail !== "UNKNOWN") {
              const defaulted = row.issues.some((x) => x.code === "PRODUCT_DEFAULTED");
              await tx.priceObservation.create({
                data: {
                  storeId,
                  productLineId: row.productLineId,
                  priceCents: null,
                  taxIncluded: c.tax_included,
                  availability: avail,
                  strength: c.strength,
                  flavor: c.flavor,
                  canSize: c.can_size,
                  observedAt: row.observedAt,
                  sourceType: "IMPORT",
                  confidence: defaulted ? Math.min(c.confidence ?? 0.6, 0.6) : c.confidence,
                  importRowId: dbRow.id,
                  externalCallId: c.call_id,
                  notes: defaulted
                    ? [c.notes, "Product line not specified in source; attached to regular line."].filter(Boolean).join(" ")
                    : c.notes,
                },
              });
            }
          }
          if (row.deal && row.observedAt && row.productLineId) {
            await tx.quantityDeal.create({
              data: {
                storeId,
                productLineId: row.productLineId,
                minQty: row.deal.minQty,
                pricePerCanCents: row.deal.pricePerCanCents,
                discountPerCanCents: row.deal.discountPerCanCents,
                appliesAboveMinQty: row.deal.appliesAboveMinQty,
                conditions: row.deal.conditions,
                expiresAt: row.deal.expiresAt,
                observedAt: row.observedAt,
                sourceType: "IMPORT",
                importRowId: dbRow.id,
              },
            });
          }
        }

        await tx.importRow.update({
          where: { id: dbRow.id },
          data: {
            outcome: row.outcome,
            issuesJson: JSON.stringify(row.issues),
            matchedStoreId: storeId ?? row.matchedStoreId,
          },
        });
      }

      const counts = countOutcomes(validated);
      await tx.importBatch.update({
        where: { id: batch.id },
        data: {
          status: "COMMITTED",
          committedAt: new Date(),
          totalRows: counts.total,
          acceptedRows: counts.accepted,
          updatedRows: counts.updated,
          skippedRows: counts.skipped,
          flaggedRows: counts.flagged,
          rejectedRows: counts.rejected,
        },
      });
    },
    { timeout: 60_000 }
  );

  await audit("IMPORT_COMMITTED", {
    userId: opts.userId,
    targetType: "importBatch",
    targetId: batchId,
    detail: countOutcomes(validated) as unknown as Record<string, unknown>,
  });
  return countOutcomes(validated);
}

/**
 * Reverse a committed batch: invalidate (not delete) its observations and
 * deals. Stores created by the batch are retired only if they have no other
 * evidence. History stays traceable.
 */
export async function reverseBatch(
  batchId: string,
  reason: string,
  userId?: string
): Promise<void> {
  const batch = await prisma.importBatch.findUniqueOrThrow({
    where: { id: batchId },
    include: { rows: true },
  });
  if (batch.status !== "COMMITTED") throw new Error(`Batch is ${batch.status}, not COMMITTED`);
  const rowIds = batch.rows.map((r) => r.id);

  await prisma.$transaction(async (tx) => {
    await tx.priceObservation.updateMany({
      where: { importRowId: { in: rowIds } },
      data: { status: "INVALIDATED", invalidReason: `Import reversed: ${reason}` },
    });
    await tx.quantityDeal.updateMany({
      where: { importRowId: { in: rowIds } },
      data: { status: "INVALIDATED" },
    });
    // Retire stores that now have zero non-invalidated evidence and no other activity
    const affectedStores = await tx.priceObservation.findMany({
      where: { importRowId: { in: rowIds } },
      select: { storeId: true },
      distinct: ["storeId"],
    });
    for (const { storeId } of affectedStores) {
      const evidence = await tx.priceObservation.count({
        where: { storeId, status: { in: ["ACTIVE", "SUPERSEDED", "PENDING"] } },
      });
      const contributions = await tx.contribution.count({ where: { storeId } });
      if (evidence === 0 && contributions === 0) {
        // keep sanitized directory stores (no observations ever) intact:
        // only retire stores whose *only* reason to exist was this batch.
        const createdByBatch = await tx.importRow.count({
          where: { id: { in: rowIds }, matchedStoreId: storeId, outcome: "ACCEPTED" },
        });
        if (createdByBatch > 0) {
          await tx.store.update({ where: { id: storeId }, data: { status: "RETIRED" } });
        }
      }
    }
    await tx.importBatch.update({
      where: { id: batchId },
      data: { status: "REVERSED", reversedAt: new Date(), reversedById: userId, reverseReason: reason },
    });
  });

  await audit("IMPORT_REVERSED", {
    userId,
    targetType: "importBatch",
    targetId: batchId,
    detail: { reason },
  });
}
