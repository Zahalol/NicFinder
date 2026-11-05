// "Did you mean?" for mistyped 5-digit ZIPs. Generates close variants
// (one digit changed, or adjacent digits swapped) and keeps the ones that
// exist in the bundled ZIP dataset. Pure and cheap: ≤ 49 lookups.

import { zipInfo } from "./geocode";

export interface ZipSuggestion {
  zip: string;
  city: string;
  state: string;
}

export function suggestZips(input: string, limit = 3): ZipSuggestion[] {
  const zip = input.trim();
  if (!/^\d{5}$/.test(zip)) return [];

  const candidates = new Set<string>();
  // One digit replaced.
  for (let i = 0; i < 5; i++) {
    for (let d = 0; d <= 9; d++) {
      const c = zip.slice(0, i) + d + zip.slice(i + 1);
      if (c !== zip) candidates.add(c);
    }
  }
  // Adjacent digits transposed.
  for (let i = 0; i < 4; i++) {
    const c =
      zip.slice(0, i) + zip[i + 1] + zip[i] + zip.slice(i + 2);
    if (c !== zip) candidates.add(c);
  }

  const out: ZipSuggestion[] = [];
  for (const c of candidates) {
    const info = zipInfo(c);
    if (info) out.push({ zip: c, ...info });
    if (out.length >= limit * 4) break; // plenty to rank
  }
  // Prefer suggestions that share the leading digits (same region).
  out.sort((a, b) => {
    const pa = prefixLen(a.zip, zip);
    const pb = prefixLen(b.zip, zip);
    if (pa !== pb) return pb - pa;
    return a.zip.localeCompare(b.zip);
  });
  return out.slice(0, limit);
}

function prefixLen(a: string, b: string): number {
  let n = 0;
  while (n < a.length && a[n] === b[n]) n++;
  return n;
}
