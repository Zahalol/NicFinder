// All prices are integer cents internally.

/**
 * Parse a human/spreadsheet price into cents.
 * Accepts "5.99", "$5.99", " 5.99 ", "6", "6.5". Rejects negatives,
 * non-numeric, and values with more than 2 decimal places.
 * Returns null when unparseable.
 */
export function parsePriceToCents(input: unknown): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") {
    if (!Number.isFinite(input) || input < 0) return null;
    const cents = Math.round(input * 100);
    // Guard float noise: 5.99 -> 599, but reject sub-cent intent like 5.999
    if (Math.abs(input * 100 - cents) > 0.001) return null;
    return cents;
  }
  const s = String(input).trim().replace(/^\$/, "").replace(/,/g, "");
  if (!s) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  return parseInt(whole, 10) * 100 + parseInt((frac + "00").slice(0, 2), 10);
}

export function formatCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

/** Sanity bounds for a single-can nicotine pouch price, in cents. */
export const PRICE_SANITY = { min: 100, max: 2500 };

export function isPriceSane(cents: number): boolean {
  return cents >= PRICE_SANITY.min && cents <= PRICE_SANITY.max;
}
