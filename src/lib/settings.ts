// Centralized, configurable thresholds. Stored as a single JSON blob in the
// Setting table; defaults documented in docs/COMMUNITY_REPUTATION.md.

import { prisma } from "./db";

export interface AppSettings {
  /** Observations older than this many days are labeled "stale". */
  staleAfterDays: number;
  /** Observations older than this are excluded from "latest price" entirely. */
  expireAfterDays: number;
  /** Reputation needed to auto-publish a replacement price (within guardrails). */
  trustedReputation: number;
  /** Independent confirmations a low-rep replacement needs to publish. */
  corroborationsRequired: number;
  /** Max relative change (e.g. 0.5 = ±50%) a trusted auto-publish may apply. */
  maxTrustedPriceChangeRatio: number;
  /** Min/max sane single-can price in cents (hard guardrail). */
  priceSanityMinCents: number;
  priceSanityMaxCents: number;
  /** Contributions per user per hour. */
  contributionRateLimitPerHour: number;
  /** Comments per user per hour. */
  commentRateLimitPerHour: number;
  /** Days before the same user may re-confirm the same observation lineage. */
  reconfirmCooldownDays: number;
  /** Confirmation weight half-life in days (older confirmations count less). */
  confirmationHalfLifeDays: number;
  /** Reports needed to auto-hide a comment pending review. */
  autoHideReportCount: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  staleAfterDays: 21,
  expireAfterDays: 120,
  trustedReputation: 50,
  corroborationsRequired: 2,
  maxTrustedPriceChangeRatio: 0.5,
  priceSanityMinCents: 100,
  priceSanityMaxCents: 2500,
  contributionRateLimitPerHour: 6,
  commentRateLimitPerHour: 10,
  reconfirmCooldownDays: 3,
  confirmationHalfLifeDays: 45,
  autoHideReportCount: 3,
};

const KEY = "app";

// Settings are read on almost every request (search, contributions, SEO
// pages), so cache them briefly per process. Writes refresh the cache
// immediately in the writing process; other instances converge within the
// TTL. Disabled under tests, which reset the DB between cases.
const CACHE_TTL_MS = 10_000;
let cached: { value: AppSettings; at: number } | null = null;

function cacheEnabled(): boolean {
  return process.env.NODE_ENV !== "test";
}

export async function getSettings(): Promise<AppSettings> {
  if (cacheEnabled() && cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.value;
  }
  const row = await prisma.setting.findUnique({ where: { key: KEY } });
  let value: AppSettings;
  if (!row) {
    value = { ...DEFAULT_SETTINGS };
  } else {
    try {
      value = { ...DEFAULT_SETTINGS, ...JSON.parse(row.valueJson) };
    } catch {
      value = { ...DEFAULT_SETTINGS };
    }
  }
  cached = { value, at: Date.now() };
  return value;
}

export async function updateSettings(
  patch: Partial<AppSettings>
): Promise<AppSettings> {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await prisma.setting.upsert({
    where: { key: KEY },
    create: { key: KEY, valueJson: JSON.stringify(next) },
    update: { valueJson: JSON.stringify(next) },
  });
  cached = { value: next, at: Date.now() };
  return next;
}
