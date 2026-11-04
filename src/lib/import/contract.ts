// Canonical import contract (v1). Human documentation: IMPORT_CONTRACT.md.
// The ingestion engine is brand-agnostic: product lines come from the DB,
// not from hard-coded ZYN references.

export const CONTRACT_VERSION = 1;

export interface CanonicalRow {
  // Store identity
  external_store_id: string | null;
  store_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null; // raw; normalized later
  // Observation
  observed_at: string | null; // ISO 8601
  product_line: string | null; // slug, e.g. "zyn" | "zyn-ultra"
  price_usd: string | number | null;
  currency: string | null;
  tax_included: boolean | null;
  availability: string | null; // in_stock|out_of_stock|not_carried|unknown
  confidence: number | null; // 0..1
  strength: string | null;
  flavor: string | null;
  can_size: string | null;
  // Deal (optional)
  deal_min_qty: number | null;
  deal_price_per_can_usd: string | number | null;
  deal_discount_per_can_usd: string | number | null;
  deal_applies_above_min_qty: boolean | null;
  deal_conditions: string | null;
  deal_expires_at: string | null;
  // Provenance
  source_row_id: string | null;
  call_id: string | null;
  notes: string | null;
}

export const CANONICAL_FIELDS = [
  "external_store_id",
  "store_name",
  "address",
  "city",
  "state",
  "zip",
  "latitude",
  "longitude",
  "phone",
  "observed_at",
  "product_line",
  "price_usd",
  "currency",
  "tax_included",
  "availability",
  "confidence",
  "strength",
  "flavor",
  "can_size",
  "deal_min_qty",
  "deal_price_per_can_usd",
  "deal_discount_per_can_usd",
  "deal_applies_above_min_qty",
  "deal_conditions",
  "deal_expires_at",
  "source_row_id",
  "call_id",
  "notes",
] as const;

export type CanonicalField = (typeof CANONICAL_FIELDS)[number];

/** Header aliases (lowercased, trimmed, punctuation collapsed). */
export const HEADER_ALIASES: Record<string, CanonicalField> = {
  // identity
  "external store id": "external_store_id",
  "store id": "external_store_id",
  "external id": "external_store_id",
  "store name": "store_name",
  name: "store_name",
  store: "store_name",
  address: "address",
  "street address": "address",
  addr: "address",
  city: "city",
  state: "state",
  zip: "zip",
  "zip code": "zip",
  zipcode: "zip",
  postal: "zip",
  latitude: "latitude",
  lat: "latitude",
  longitude: "longitude",
  lng: "longitude",
  lon: "longitude",
  phone: "phone",
  "phone number": "phone",
  phonenumber: "phone",
  telephone: "phone",
  // observation
  "observed at": "observed_at",
  "observation date": "observed_at",
  "call date": "observed_at",
  "last call": "observed_at",
  "last call date": "observed_at",
  date: "observed_at",
  datetime: "observed_at",
  "product line": "product_line",
  product: "product_line",
  "price usd": "price_usd",
  price: "price_usd",
  "zyn price": "price_usd",
  "regular price": "price_usd",
  "price per can": "price_usd",
  currency: "currency",
  "tax included": "tax_included",
  "pre tax": "tax_included",
  availability: "availability",
  "in stock": "availability",
  confidence: "confidence",
  strength: "strength",
  flavor: "flavor",
  "can size": "can_size",
  // deals
  "deal min qty": "deal_min_qty",
  "deal quantity": "deal_min_qty",
  "min qty": "deal_min_qty",
  "deal price per can usd": "deal_price_per_can_usd",
  "deal price per can": "deal_price_per_can_usd",
  "deal price": "deal_price_per_can_usd",
  "deal discount per can usd": "deal_discount_per_can_usd",
  "deal discount per can": "deal_discount_per_can_usd",
  "deal discount": "deal_discount_per_can_usd",
  "deal applies above min qty": "deal_applies_above_min_qty",
  "deal conditions": "deal_conditions",
  "deal expires at": "deal_expires_at",
  "deal expires": "deal_expires_at",
  // provenance
  "source row id": "source_row_id",
  "row id": "source_row_id",
  "call id": "call_id",
  notes: "notes",
  note: "notes",
  status: "notes",
};

export function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/[_\-./]+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Map raw headers to canonical fields. Returns the mapping and the list of
 * unmapped headers (surfaced in the admin UI for manual mapping).
 */
export function autoMapHeaders(headers: string[]): {
  mapping: Record<string, CanonicalField | null>;
  unmapped: string[];
} {
  const mapping: Record<string, CanonicalField | null> = {};
  const unmapped: string[] = [];
  const used = new Set<CanonicalField>();
  for (const h of headers) {
    const norm = normalizeHeader(h);
    const direct = (CANONICAL_FIELDS as readonly string[]).includes(norm.replace(/ /g, "_"))
      ? (norm.replace(/ /g, "_") as CanonicalField)
      : null;
    const target = direct ?? HEADER_ALIASES[norm] ?? null;
    if (target && !used.has(target)) {
      mapping[h] = target;
      used.add(target);
    } else {
      mapping[h] = null;
      if (norm) unmapped.push(h);
    }
  }
  return { mapping, unmapped };
}

export const BOOL_TRUE = new Set(["true", "yes", "y", "1"]);
export const BOOL_FALSE = new Set(["false", "no", "n", "0"]);

export function parseBool(v: unknown): boolean | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (BOOL_TRUE.has(s)) return true;
  if (BOOL_FALSE.has(s)) return false;
  return null;
}

export const AVAILABILITY_VALUES: Record<string, string> = {
  in_stock: "IN_STOCK",
  "in stock": "IN_STOCK",
  instock: "IN_STOCK",
  yes: "IN_STOCK",
  out_of_stock: "OUT_OF_STOCK",
  "out of stock": "OUT_OF_STOCK",
  oos: "OUT_OF_STOCK",
  not_carried: "NOT_CARRIED",
  "not carried": "NOT_CARRIED",
  "doesn't carry": "NOT_CARRIED",
  "does not carry": "NOT_CARRIED",
  no: "NOT_CARRIED",
  unknown: "UNKNOWN",
  "": "UNKNOWN",
};
