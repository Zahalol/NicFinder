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

// --- Pluggable anonymous-endpoint limiter ---------------------------------
//
// Two interchangeable backends behind one async call:
//   memory (default) — per-process sliding window, zero infrastructure.
//     Fine for single-process deployments and local dev.
//   db — sliding window over RateLimitEvent rows, shared across processes.
//     Choose with RATE_LIMIT_BACKEND=db on multi-instance deployments
//     (e.g. Replit Autoscale). No Redis required; the maintenance job
//     prunes old rows.
// Both fail OPEN on storage errors: an outage must never lock everyone out
// of login. (Abuse during an outage is bounded by the outage itself.)

export interface RateLimitStore {
  /** Record a hit and say whether it is within limits. */
  hit(key: string, max: number, windowMs: number): Promise<boolean>;
}

class MemoryStore implements RateLimitStore {
  async hit(key: string, max: number, windowMs: number): Promise<boolean> {
    return memoryRateLimit(key, max, windowMs);
  }
}

class DbStore implements RateLimitStore {
  async hit(key: string, max: number, windowMs: number): Promise<boolean> {
    const since = new Date(Date.now() - windowMs);
    try {
      const recent = await prisma.rateLimitEvent.count({
        where: { key, createdAt: { gte: since } },
      });
      if (recent >= max) return false;
      await prisma.rateLimitEvent.create({ data: { key } });
      return true;
    } catch (e) {
      console.error("rate-limit db backend failed; failing open", e);
      return true;
    }
  }
}

let store: RateLimitStore | null = null;

export function getRateLimitStore(): RateLimitStore {
  if (!store) {
    store =
      process.env.RATE_LIMIT_BACKEND === "db" ? new DbStore() : new MemoryStore();
  }
  return store;
}

/** For tests: swap the backend explicitly. */
export function setRateLimitStore(s: RateLimitStore | null): void {
  store = s;
}

/** Rate-limit an anonymous action. True = allowed. */
export async function rateLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<boolean> {
  return getRateLimitStore().hit(key, max, windowMs);
}

// In-memory sliding window (per process — adequate for the MVP; see
// docs/ARCHITECTURE.md for the production note).
const buckets = new Map<string, number[]>();

// Bound memory under key spraying (e.g. spoofed X-Forwarded-For values):
// above the cap, drop the oldest-inserted buckets first. Churning the map
// this way can only ever RELAX limits for evicted keys, never lock anyone out.
const MAX_BUCKETS = 50_000;

function evictIfNeeded() {
  if (buckets.size <= MAX_BUCKETS) return;
  const drop = buckets.size - MAX_BUCKETS;
  let i = 0;
  for (const key of buckets.keys()) {
    buckets.delete(key);
    if (++i >= drop) break;
  }
}

export function memoryRateLimit(
  key: string,
  max: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    buckets.set(key, arr);
    return false;
  }
  arr.push(now);
  // Delete-then-set refreshes insertion order, so active keys sit at the
  // back of the eviction queue.
  buckets.delete(key);
  buckets.set(key, arr);
  evictIfNeeded();
  return true;
}
