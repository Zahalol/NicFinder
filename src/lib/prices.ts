// Latest-price selection policy.
//
// Observations are an append-only evidence log; what a visitor sees is
// *computed* from it. Policy (documented in ARCHITECTURE.md):
//  1. Only ACTIVE observations count.
//  2. Observations older than expireAfterDays are excluded entirely —
//     we show "no recent price" rather than something ancient.
//  3. Among the rest, pick the most recent observedAt. Ties broken by
//     source priority (ADMIN > CALL > IMPORT > COMMUNITY) then createdAt.
//  4. The result carries freshness ("fresh" | "stale") and verification
//     counts so the UI can be honest about quality.

import type { PriceObservation, Verification } from "@prisma/client";
import type { AppSettings } from "./settings";

const SOURCE_PRIORITY: Record<string, number> = {
  ADMIN: 4,
  CALL: 3,
  IMPORT: 2,
  COMMUNITY: 1,
};

export type ObservationWithVerifications = PriceObservation & {
  verifications?: Verification[];
};

export interface LatestPrice {
  observation: ObservationWithVerifications;
  freshness: "fresh" | "stale";
  ageDays: number;
  confirmCount: number;
  disputeCount: number;
}

export function selectLatestPrice(
  observations: ObservationWithVerifications[],
  settings: Pick<AppSettings, "staleAfterDays" | "expireAfterDays">,
  now: Date = new Date()
): LatestPrice | null {
  const cutoff = now.getTime() - settings.expireAfterDays * 86400_000;
  const candidates = observations.filter(
    (o) => o.status === "ACTIVE" && o.observedAt.getTime() >= cutoff
  );
  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    const t = b.observedAt.getTime() - a.observedAt.getTime();
    if (t !== 0) return t;
    const p =
      (SOURCE_PRIORITY[b.sourceType] ?? 0) - (SOURCE_PRIORITY[a.sourceType] ?? 0);
    if (p !== 0) return p;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const chosen = candidates[0];
  const ageDays = Math.floor(
    (now.getTime() - chosen.observedAt.getTime()) / 86400_000
  );
  const verifications = chosen.verifications ?? [];
  return {
    observation: chosen,
    freshness: ageDays > settings.staleAfterDays ? "stale" : "fresh",
    ageDays,
    confirmCount: verifications.filter((v) => v.verdict === "CONFIRM").length,
    disputeCount: verifications.filter((v) => v.verdict === "REJECT").length,
  };
}
