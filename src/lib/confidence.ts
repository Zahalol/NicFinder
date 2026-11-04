// Price-confidence scoring: one glanceable, *transparent* summary of how much
// weight a displayed price deserves. Computed purely from recorded evidence —
// source type, age, and member verifications. Never fabricates certainty:
// the reasons behind every score are returned alongside it and shown in the UI.

export type ConfidenceTier = "high" | "medium" | "low";

export interface ConfidenceInput {
  sourceType: string; // ADMIN | CALL | IMPORT | COMMUNITY
  ageDays: number;
  confirmCount: number;
  disputeCount: number;
}

export interface Confidence {
  score: number; // 0–100
  tier: ConfidenceTier;
  reasons: string[];
}

const SOURCE_BASE: Record<string, number> = {
  ADMIN: 70, // staff-entered
  CALL: 70, // confirmed with the store by phone
  IMPORT: 60, // bulk data import
  COMMUNITY: 55, // single member report
};

const SOURCE_LABEL: Record<string, string> = {
  ADMIN: "staff-entered",
  CALL: "confirmed by store call",
  IMPORT: "from a data import",
  COMMUNITY: "reported by a member",
};

/** Gentle decay for the first week, steeper after. */
function ageDecay(ageDays: number): number {
  const d = ageDays <= 7 ? ageDays * 0.8 : 5.6 + (ageDays - 7) * 1.5;
  return Math.min(d, 45);
}

export function computeConfidence(input: ConfidenceInput): Confidence {
  const base = SOURCE_BASE[input.sourceType] ?? 50;
  const decay = ageDecay(Math.max(0, input.ageDays));
  const confirms = Math.min(input.confirmCount, 3) * 12;
  const disputes = input.disputeCount * 18;
  const score = Math.round(
    Math.max(0, Math.min(100, base - decay + confirms - disputes))
  );
  const tier: ConfidenceTier = score >= 65 ? "high" : score >= 35 ? "medium" : "low";

  const reasons: string[] = [SOURCE_LABEL[input.sourceType] ?? "unknown source"];
  reasons.push(
    input.ageDays === 0
      ? "updated today"
      : `${input.ageDays} day${input.ageDays === 1 ? "" : "s"} old`
  );
  if (input.confirmCount > 0)
    reasons.push(
      `${input.confirmCount} member confirmation${input.confirmCount === 1 ? "" : "s"}`
    );
  if (input.disputeCount > 0)
    reasons.push(`${input.disputeCount} dispute${input.disputeCount === 1 ? "" : "s"}`);

  return { score, tier, reasons };
}
