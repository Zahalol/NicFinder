// DB-backed rate limiting for contributions/comments (counts recent rows),
// plus a small in-memory limiter for anonymous endpoints (auth attempts).

import { prisma } from "./db";

export async function countRecentContributions(
  userId: string,
  windowHours = 1
): Promise<number> {
  return prisma.contribution.count({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - windowHours * 3600_000) },
    },
  });
}

export async function countRecentComments(
  userId: string,
  windowHours = 1
): Promise<number> {
  return prisma.comment.count({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - windowHours * 3600_000) },
    },
  });
}

// In-memory sliding window (per process — adequate for the MVP; see
// docs/ARCHITECTURE.md for the production note).
const buckets = new Map<string, number[]>();

// The map is keyed by attacker-controlled values (IPs, emails), so it must
// not grow without bound: sweep out buckets whose entries have all aged past
// the largest window we use. Sweeping lazily on write keeps this dependency-
// free and O(1) amortized.
const SWEEP_EVERY_MS = 60_000;
const MAX_WINDOW_MS = 3_600_000; // largest window used by any caller
let lastSweepAt = 0;

function sweep(now: number): void {
  if (now - lastSweepAt < SWEEP_EVERY_MS) return;
  lastSweepAt = now;
  for (const [key, arr] of buckets) {
    if (!arr.length || now - arr[arr.length - 1] >= MAX_WINDOW_MS) {
      buckets.delete(key);
    }
  }
}

export function memoryRateLimit(
  key: string,
  max: number,
  windowMs: number
): boolean {
  const now = Date.now();
  sweep(now);
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    buckets.set(key, arr);
    return false;
  }
  arr.push(now);
  buckets.set(key, arr);
  return true;
}
