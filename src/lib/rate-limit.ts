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
  buckets.set(key, arr);
  return true;
}
