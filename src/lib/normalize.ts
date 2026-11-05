// Normalization helpers used by store matching and import dedupe.

/** Normalize a US phone number to E.164 (+1XXXXXXXXXX) or null. */
export function normalizePhone(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  const digits = String(input).replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

const STREET_ABBREV: Record<string, string> = {
  street: "st",
  avenue: "ave",
  av: "ave",
  boulevard: "blvd",
  drive: "dr",
  parkway: "pkwy",
  road: "rd",
  lane: "ln",
  court: "ct",
  place: "pl",
  highway: "hwy",
  north: "n",
  south: "s",
  east: "e",
  west: "w",
  suite: "ste",
};

/**
 * Normalize a street address for comparison: lowercase, collapse
 * whitespace/punctuation, standardize common abbreviations.
 * NOT a USPS-grade normalizer — conservative by design; ambiguous
 * matches go to manual resolution.
 */
export function normalizeAddress(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  let s = String(input).toLowerCase().trim();
  if (!s) return null;
  s = s.replace(/[.,#]/g, " ").replace(/\s+/g, " ").trim();
  s = s
    .split(" ")
    .map((w) => STREET_ABBREV[w] ?? w)
    .join(" ");
  return s;
}

/** Simple Jaro–Winkler-ish similarity via bigram Dice coefficient (0..1). */
export function nameSimilarity(a: string, b: string): number {
  const clean = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const x = clean(a);
  const y = clean(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const bigrams = (s: string) => {
    const set = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2);
      set.set(bg, (set.get(bg) ?? 0) + 1);
    }
    return set;
  };
  const bx = bigrams(x);
  const by = bigrams(y);
  let overlap = 0;
  let total = 0;
  for (const [bg, n] of bx) {
    overlap += Math.min(n, by.get(bg) ?? 0);
    total += n;
  }
  for (const n of by.values()) total += n;
  return total === 0 ? 0 : (2 * overlap) / total;
}

/** Parse "1160 W Diversey Pkwy, Chicago, IL 60614" into parts (best effort). */
export function splitUsAddress(full: string): {
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
} {
  const s = full.trim().replace(/\s+/g, " ");
  const m = s.match(/^(.*?),\s*([^,]+?),\s*([A-Za-z]{2})\.?\s*(\d{5})(-\d{4})?$/);
  if (m) {
    return {
      street: m[1].trim() || null,
      city: m[2].trim() || null,
      state: m[3].toUpperCase(),
      zip: m[4],
    };
  }
  const zipM = s.match(/\b(\d{5})(-\d{4})?\s*$/);
  return { street: s || null, city: null, state: null, zip: zipM?.[1] ?? null };
}

/** +13125550101 → (312) 555-0101 for display; non-US passes through. */
export function formatPhoneDisplay(e164: string): string {
  const m = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}
