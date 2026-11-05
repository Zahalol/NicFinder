// Geocoding: offline ZIP centroids (bundled, GeoNames CC BY 4.0) with an
// optional Nominatim (OpenStreetMap) fallback for street addresses.
// Nominatim results are cached in the DB and requests are throttled to
// 1/sec per their usage policy. Set NOMINATIM_ENABLED=false for fully
// offline operation (ZIP-only search).

import fs from "node:fs";
import path from "node:path";
import { prisma } from "./db";

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  label: string;
  provider: "zip-centroid" | "nominatim" | "cache";
  /** Centroid results are approximate (ZIP center, not the exact address). */
  approximate: boolean;
}

interface ZipRow {
  lat: number;
  lng: number;
  city: string;
  state: string;
}

let zipIndex: Map<string, ZipRow> | null = null;

function loadZipIndex(): Map<string, ZipRow> {
  if (zipIndex) return zipIndex;
  const file = path.join(process.cwd(), "src", "data", "zip-centroids.csv");
  const text = fs.readFileSync(file, "utf-8");
  const map = new Map<string, ZipRow>();
  // Tolerate CRLF: on Windows, git's autocrlf may rewrite the dataset.
  const lines = text.split(/\r?\n/);
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    // zip,lat,lng,"city",state
    const m = line.match(/^(\d{5}),([-\d.]+),([-\d.]+),"(.*)",(\w{2})$/);
    if (!m) continue;
    map.set(m[1], {
      lat: parseFloat(m[2]),
      lng: parseFloat(m[3]),
      city: m[4],
      state: m[5],
    });
  }
  zipIndex = map;
  return map;
}

/** City/state for a ZIP from the bundled dataset (no network). */
export function zipInfo(zip: string): { city: string; state: string } | null {
  const row = loadZipIndex().get(zip.trim().slice(0, 5));
  return row ? { city: row.city, state: row.state } : null;
}

/** Nearest ZIP to a coordinate (linear scan of the bundled dataset). */
export function nearestZip(
  lat: number,
  lng: number
): { zip: string; city: string; state: string } | null {
  let best: { zip: string; d2: number; row: ZipRow } | null = null;
  const cosLat = Math.cos((lat * Math.PI) / 180) ** 2;
  for (const [zip, row] of loadZipIndex()) {
    const dLat = row.lat - lat;
    const dLng = row.lng - lng;
    const d2 = dLat * dLat + dLng * dLng * cosLat;
    if (!best || d2 < best.d2) best = { zip, d2, row };
  }
  if (!best) return null;
  return { zip: best.zip, city: best.row.city, state: best.row.state };
}

export function geocodeZip(zip: string): GeocodeResult | null {
  const z = zip.trim().slice(0, 5);
  if (!/^\d{5}$/.test(z)) return null;
  const row = loadZipIndex().get(z);
  if (!row) return null;
  return {
    latitude: row.lat,
    longitude: row.lng,
    label: `${row.city}, ${row.state} ${z}`,
    provider: "zip-centroid",
    approximate: true,
  };
}

// --- Nominatim ---------------------------------------------------------

let lastNominatimAt = 0;

async function nominatimSearch(query: string): Promise<GeocodeResult | null> {
  if (process.env.NOMINATIM_ENABLED === "false") return null;
  // Throttle: >= 1100ms between requests (Nominatim policy is max 1/sec).
  // Reserve the slot BEFORE sleeping — updating the timestamp after the wait
  // let N concurrent requests all read the same old value and fire together.
  const now = Date.now();
  const slot = Math.max(now, lastNominatimAt + 1100);
  lastNominatimAt = slot;
  if (slot > now) await new Promise((r) => setTimeout(r, slot - now));

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "us");
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": process.env.NOMINATIM_USER_AGENT || "nicfinder-dev",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;
    if (!data.length) return null;
    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
      label: data[0].display_name,
      provider: "nominatim",
      approximate: false,
    };
  } catch {
    return null; // offline / blocked — caller falls back honestly
  }
}

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 200);
}

/**
 * Geocode any user query: 5-digit ZIP → offline centroid; otherwise try the
 * DB cache, then Nominatim (cached either way). Returns null with no
 * fabrication when nothing resolves.
 */
export async function geocode(queryRaw: string): Promise<GeocodeResult | null> {
  const query = normalizeQuery(queryRaw);
  if (!query) return null;

  // Pure ZIP (possibly ZIP+4)
  const zipMatch = query.match(/^(\d{5})(-\d{4})?$/);
  if (zipMatch) return geocodeZip(zipMatch[1]);

  // Cache
  const cached = await prisma.geocodeCache.findUnique({ where: { query } });
  if (cached) {
    if (cached.status === "NOT_FOUND" || cached.latitude === null) return null;
    return {
      latitude: cached.latitude,
      longitude: cached.longitude!,
      label: cached.label || queryRaw,
      provider: "cache",
      approximate: cached.provider === "zip-centroid",
    };
  }

  const result = await nominatimSearch(query);
  if (result) {
    await prisma.geocodeCache
      .create({
        data: {
          query,
          latitude: result.latitude,
          longitude: result.longitude,
          label: result.label,
          status: "OK",
          provider: "nominatim",
        },
      })
      .catch(() => {}); // race on unique(query) is fine
    return result;
  }

  // Last resort: if the query *contains* a ZIP, use its centroid.
  const embeddedZip = query.match(/\b(\d{5})\b/);
  if (embeddedZip) {
    const byZip = geocodeZip(embeddedZip[1]);
    if (byZip) return byZip;
  }

  // Cache negative results only when Nominatim actually answered "no match"
  // is indistinguishable from network failure here, so we do NOT cache
  // NOT_FOUND to avoid poisoning the cache while offline.
  return null;
}
