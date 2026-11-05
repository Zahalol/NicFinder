// Price reliability: a transparent, qualitative read on how much weight a
// displayed price deserves. Deliberately three tiers, not a percentage — a
// number like "87% reliable" would be false precision we can't back.
//
// Factors (all visible to the user in the tooltip):
//   + recency        (fresh beats stale; expired prices are never shown at all)
//   + source         (staff/call-verified > import > community)
//   + corroboration  (independent confirmations)
//   - disputes       (unresolved "that's wrong" signals)
//   - low stated confidence from the source feed
//
// The mapping is intentionally simple enough to explain in one sentence
// per factor. Tests pin the behavior.

export interface ReliabilityInput {
  ageDays: number;
  staleAfterDays: number;
  sourceType: string; // ADMIN | CALL | IMPORT | COMMUNITY
  confirmCount: number;
  disputeCount: number;
  /** source-stated confidence 0..1, if any */
  confidence: number | null;
}

export type ReliabilityLevel = "high" | "medium" | "low";

export interface Reliability {
  level: ReliabilityLevel;
  /** human-readable factor list, shown verbatim in the tooltip */
  reasons: string[];
}

export function assessReliability(input: ReliabilityInput): Reliability {
  let score = 0;
  const reasons: string[] = [];

  // Recency
  if (input.ageDays <= 7) {
    score += 2;
    reasons.push(`observed ${input.ageDays === 0 ? "today" : `${input.ageDays}d ago`}`);
  } else if (input.ageDays <= input.staleAfterDays) {
    score += 1;
    reasons.push(`observed ${input.ageDays}d ago`);
  } else {
    reasons.push(`stale — ${input.ageDays}d old`);
  }

  // Source
  if (input.sourceType === "ADMIN" || input.sourceType === "CALL") {
    score += 2;
    reasons.push(input.sourceType === "CALL" ? "verified by store call" : "staff-entered");
  } else if (input.sourceType === "IMPORT") {
    score += 1;
    reasons.push("from a data import");
  } else {
    reasons.push("community-reported");
  }

  // Corroboration
  if (input.confirmCount > 0) {
    score += Math.min(2, input.confirmCount);
    reasons.push(
      `confirmed by ${input.confirmCount} member${input.confirmCount === 1 ? "" : "s"}`
    );
  }

  // Disputes
  if (input.disputeCount > 0) {
    score -= 2 * input.disputeCount;
    reasons.push(
      `disputed by ${input.disputeCount} member${input.disputeCount === 1 ? "" : "s"}`
    );
  }

  // Source-stated confidence
  if (input.confidence !== null && input.confidence < 0.5) {
    score -= 1;
    reasons.push("source marked this low-confidence");
  }

  const level: ReliabilityLevel = score >= 4 ? "high" : score >= 2 ? "medium" : "low";
  return { level, reasons };
}

export const RELIABILITY_LABEL: Record<ReliabilityLevel, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};
