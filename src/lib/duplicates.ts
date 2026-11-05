// Catalog-wide duplicate-store scan.
//
// Import-time detection only catches duplicates created in the same batch
// near existing stores; this scan sweeps the whole ACTIVE catalog:
//   - identity collisions: two stores sharing a normalized phone or address
//   - proximity + similar name: within 150m and nameSimilarity >= 0.5
// Candidates are scored, deduped per pair (sorted ids, unique constraint),
// and NEVER re-opened once a moderator dismissed or merged the pair — a
// dismissal is a human decision the scanner must respect.

import { prisma } from "./db";
import { normalizePhone, normalizeAddress, nameSimilarity } from "./normalize";
import { metersBetween } from "./geo";

export interface DuplicateScanResult {
  scannedStores: number;
  candidatesCreated: number;
}

interface Suggestion {
  aId: string;
  bId: string;
  reason: string;
  score: number;
}

const NEAR_METERS = 150;

export async function scanForDuplicates(): Promise<DuplicateScanResult> {
  const stores = await prisma.store.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      latitude: true,
      longitude: true,
    },
  });

  const suggestions = new Map<string, Suggestion>();
  function suggest(aId: string, bId: string, reason: string, score: number) {
    if (aId === bId) return;
    const [a, b] = [aId, bId].sort();
    const key = `${a}|${b}`;
    const existing = suggestions.get(key);
    if (!existing || existing.score < score) {
      suggestions.set(key, { aId: a, bId: b, reason, score });
    }
  }

  // Identity collisions.
  const byPhone = new Map<string, string[]>();
  const byAddress = new Map<string, string[]>();
  for (const s of stores) {
    const phone = normalizePhone(s.phone);
    if (phone) byPhone.set(phone, [...(byPhone.get(phone) ?? []), s.id]);
    const addr = normalizeAddress(s.address);
    if (addr) byAddress.set(addr, [...(byAddress.get(addr) ?? []), s.id]);
  }
  for (const [, ids] of byAddress) {
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++)
        suggest(ids[i], ids[j], "Same normalized address", 0.9);
  }
  for (const [, ids] of byPhone) {
    // Shared corporate numbers are common, so phone alone scores lower and
    // only pairs with few stores on the number are suggested.
    if (ids.length > 3) continue;
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++)
        suggest(ids[i], ids[j], "Same phone number", 0.7);
  }

  // Proximity + name similarity (grid-bucketed so the pass stays near-linear).
  const CELL = 0.002; // ~220m of latitude
  const grid = new Map<string, typeof stores>();
  for (const s of stores) {
    if (s.latitude === null || s.longitude === null) continue;
    const cx = Math.floor(s.latitude / CELL);
    const cy = Math.floor(s.longitude / CELL);
    const key = `${cx}:${cy}`;
    grid.set(key, [...(grid.get(key) ?? []), s]);
  }
  for (const s of stores) {
    if (s.latitude === null || s.longitude === null) continue;
    const cx = Math.floor(s.latitude / CELL);
    const cy = Math.floor(s.longitude / CELL);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const o of grid.get(`${cx + dx}:${cy + dy}`) ?? []) {
          if (o.id <= s.id) continue; // each pair once
          if (o.latitude === null || o.longitude === null) continue;
          const d = metersBetween(s.latitude, s.longitude, o.latitude, o.longitude);
          if (d > NEAR_METERS) continue;
          const sim = nameSimilarity(s.name, o.name);
          if (sim >= 0.8) {
            suggest(s.id, o.id, `Within ${Math.round(d)}m, nearly identical names`, 0.85);
          } else if (sim >= 0.5) {
            suggest(s.id, o.id, `Within ${Math.round(d)}m, similar names`, 0.6);
          }
        }
      }
    }
  }

  if (suggestions.size === 0) return { scannedStores: stores.length, candidatesCreated: 0 };

  // Respect human decisions: drop pairs that already have ANY candidate row
  // (open, dismissed or merged). The unique constraint would block them
  // anyway, but a dismissed pair must not be re-suggested even if the old
  // row were cleaned up — so filter explicitly.
  const existing = await prisma.duplicateCandidate.findMany({
    select: { storeAId: true, storeBId: true },
  });
  const seen = new Set(existing.map((e) => `${e.storeAId}|${e.storeBId}`));
  const fresh = [...suggestions.values()].filter(
    (s) => !seen.has(`${s.aId}|${s.bId}`)
  );

  if (fresh.length) {
    await prisma.duplicateCandidate.createMany({
      data: fresh.map((s) => ({
        storeAId: s.aId,
        storeBId: s.bId,
        reason: s.reason,
        score: s.score,
      })),
      skipDuplicates: true,
    });
  }
  return { scannedStores: stores.length, candidatesCreated: fresh.length };
}
