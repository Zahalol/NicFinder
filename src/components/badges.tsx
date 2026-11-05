import type { StoreResult } from "@/lib/search";
import { formatCents } from "@/lib/money";
import {
  RELIABILITY_LABEL,
  type Reliability,
} from "@/lib/reliability";

/**
 * Qualitative confidence chip. The tooltip lists every factor verbatim so
 * the assessment is auditable by the reader, not a black box.
 */
export function ReliabilityBadge({ reliability }: { reliability: Reliability }) {
  const styles: Record<Reliability["level"], string> = {
    high: "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    medium: "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700",
    low: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  };
  return (
    <span
      className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${styles[reliability.level]}`}
      title={`${RELIABILITY_LABEL[reliability.level]}: ${reliability.reasons.join("; ")}`}
    >
      {RELIABILITY_LABEL[reliability.level].toLowerCase()}
    </span>
  );
}
import { computeConfidence, type ConfidenceInput } from "@/lib/confidence";

const TIER_STYLES = {
  high: { dot: "bg-emerald-500", text: "text-emerald-800 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-950", label: "High confidence" },
  medium: { dot: "bg-stone-400", text: "text-stone-600 dark:text-stone-400", bg: "bg-stone-100 dark:bg-stone-800", label: "Medium confidence" },
  low: { dot: "bg-amber-500", text: "text-amber-800 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-950/50", label: "Low confidence" },
} as const;

/** Glanceable price-confidence pill; the reasons are in the tooltip. */
export function ConfidenceBadge({
  input,
  showAge = false,
}: {
  input: ConfidenceInput;
  showAge?: boolean;
}) {
  const c = computeConfidence(input);
  const s = TIER_STYLES[c.tier];
  const age =
    input.ageDays === 0 ? "today" : `${input.ageDays}d ago`;
  return (
    <span
      title={`Why: ${c.reasons.join(" · ")}`}
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 whitespace-nowrap ${s.bg} ${s.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
      {showAge && <span className="opacity-70">· {age}</span>}
    </span>
  );
}

export function DemoBadge() {
  return (
    <span className="rounded bg-amber-100 text-amber-800 text-[10px] font-medium px-1.5 py-0.5 uppercase tracking-wide dark:bg-amber-900 dark:text-amber-300">
      demo data
    </span>
  );
}

export function DealBadge({
  deal,
}: {
  deal: NonNullable<StoreResult["deal"]>;
}) {
  const label =
    deal.discountPerCanCents !== null
      ? `${deal.minQty}-can deal: ${formatCents(deal.discountPerCanCents)} off each`
      : `${deal.minQty}-can deal: ${formatCents(deal.pricePerCanCents)} each`;
  return (
    <span className="rounded bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-[10px] font-medium px-1.5 py-0.5 border border-teal-200 dark:border-teal-800">
      {label}
      {deal.conditions ? "*" : ""}
    </span>
  );
}

export function FreshnessBadge({
  latest,
}: {
  latest: NonNullable<StoreResult["latest"]>;
}) {
  if (latest.freshness === "stale") {
    return (
      <span className="rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 px-1.5 py-0.5">
        {latest.ageDays}d old — may be outdated
      </span>
    );
  }
  return (
    <span className="rounded bg-emerald-50 text-emerald-700 px-1.5 py-0.5 dark:bg-emerald-950 dark:text-emerald-400">
      updated {latest.ageDays === 0 ? "today" : `${latest.ageDays}d ago`}
    </span>
  );
}

export function PriceBadge({
  result,
  qty,
}: {
  result: StoreResult;
  qty: number;
}) {
  const { latest, effective, availabilitySignal } = result;
  if (!latest) {
    if (availabilitySignal?.availability === "NOT_CARRIED") {
      return (
        <div className="text-right shrink-0">
          <div className="text-sm font-medium text-stone-500 dark:text-stone-400">Not carried</div>
          <div className="text-[11px] text-stone-400">
            reported {availabilitySignal.ageDays === 0 ? "today" : `${availabilitySignal.ageDays}d ago`}
          </div>
        </div>
      );
    }
    if (availabilitySignal?.availability === "OUT_OF_STOCK") {
      return (
        <div className="text-right shrink-0">
          <div className="text-sm font-medium text-red-600 dark:text-red-400">Out of stock</div>
          <div className="text-[11px] text-stone-400">
            reported {availabilitySignal.ageDays === 0 ? "today" : `${availabilitySignal.ageDays}d ago`}
          </div>
        </div>
      );
    }
    return (
      <div className="text-right shrink-0">
        <div className="text-sm font-medium text-stone-400">No price yet</div>
        <div className="text-[11px] text-stone-400">not yet reported</div>
      </div>
    );
  }
  if (qty === 1 || effective.perCanCents === null) {
    return (
      <div className="text-right shrink-0">
        <div className="text-xl font-semibold text-stone-900 dark:text-stone-100">
          {formatCents(latest.priceCents)}
        </div>
        <div className="text-[11px] text-stone-500 dark:text-stone-400">
          per can{latest.taxIncluded === false ? " +tax" : latest.taxIncluded === true ? " incl. tax" : ""}
        </div>
        {qty > 1 && effective.uncertain && (
          <div className="text-[11px] text-amber-600 dark:text-amber-400">deal terms unknown at {qty}</div>
        )}
      </div>
    );
  }
  return (
    <div className="text-right shrink-0">
      <div className="text-xl font-semibold text-stone-900 dark:text-stone-100">
        {formatCents(effective.perCanCents)}
        <span className="text-xs font-normal text-stone-500 dark:text-stone-400">/can</span>
      </div>
      <div className="text-[11px] text-stone-500 dark:text-stone-400">
        {formatCents(effective.totalCents)} for {qty}
        {effective.usedDeal && <span className="text-teal-700 dark:text-teal-400"> · deal applied</span>}
      </div>
    </div>
  );
}
