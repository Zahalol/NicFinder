import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb } from "./helpers";
import {
  memoryRateLimit,
  rateLimit,
  setRateLimitStore,
  getRateLimitStore,
  type RateLimitStore,
} from "@/lib/rate-limit";

// The DbStore class is private; exercise it through the env switch.
function makeDbStore(): RateLimitStore {
  const prev = process.env.RATE_LIMIT_BACKEND;
  process.env.RATE_LIMIT_BACKEND = "db";
  setRateLimitStore(null); // force re-selection
  const s = getRateLimitStore();
  process.env.RATE_LIMIT_BACKEND = prev;
  return s;
}

describe("memory rate limiter", () => {
  it("allows up to max hits in the window, then blocks", () => {
    const key = `t-${Math.random()}`;
    for (let i = 0; i < 5; i++) expect(memoryRateLimit(key, 5, 60_000)).toBe(true);
    expect(memoryRateLimit(key, 5, 60_000)).toBe(false);
  });

  it("isolates keys", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    for (let i = 0; i < 3; i++) memoryRateLimit(a, 3, 60_000);
    expect(memoryRateLimit(a, 3, 60_000)).toBe(false);
    expect(memoryRateLimit(b, 3, 60_000)).toBe(true);
  });
});

describe("db-backed rate limiter (shared across processes)", () => {
  beforeEach(async () => {
    await resetDb();
    await prisma.rateLimitEvent.deleteMany();
  });
  afterEach(() => setRateLimitStore(null));

  it("allows up to max hits, then blocks, per key", async () => {
    const store = makeDbStore();
    const key = "login:1.2.3.4";
    for (let i = 0; i < 3; i++) expect(await store.hit(key, 3, 60_000)).toBe(true);
    expect(await store.hit(key, 3, 60_000)).toBe(false);
    expect(await store.hit("login:5.6.7.8", 3, 60_000)).toBe(true);
    expect(await prisma.rateLimitEvent.count()).toBe(4); // blocked hit stored nothing
  });

  it("ignores events outside the window (sliding)", async () => {
    const store = makeDbStore();
    const key = "signup:9.9.9.9";
    // Two stale events from an hour ago…
    const old = new Date(Date.now() - 3600_000);
    await prisma.rateLimitEvent.createMany({
      data: [
        { key, createdAt: old },
        { key, createdAt: old },
      ],
    });
    // …don't count against a 60s window.
    expect(await store.hit(key, 2, 60_000)).toBe(true);
    expect(await store.hit(key, 2, 60_000)).toBe(true);
    expect(await store.hit(key, 2, 60_000)).toBe(false);
  });

  it("rateLimit() uses the injected store", async () => {
    let called = 0;
    setRateLimitStore({
      hit: async () => {
        called++;
        return false;
      },
    });
    expect(await rateLimit("x", 10, 1000)).toBe(false);
    expect(called).toBe(1);
  });
});
