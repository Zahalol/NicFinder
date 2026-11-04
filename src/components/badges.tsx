import type { StoreResult } from "@/lib/search";
import { formatCents } from "@/lib/money";

export function DemoBadge() {
  return (
    <span className="rounded bg-amber-100 text-amber-800 text-[10px] font-medium px-1.5 py-0.5 uppercase tracking-wide">
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
    <span className="rounded bg-teal-50 text-teal-800 text-[10px] font-medium px-1.5 py-0.5 border border-teal-200">
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
      <span className="rounded bg-stone-100 text-stone-600 px-1.5 py-0.5">
        {latest.ageDays}d old — may be outdated
      </span>
    );
  }
  return (
    <span className="rounded bg-emerald-50 text-emerald-700 px-1.5 py-0.5">
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
          <div className="text-sm font-medium text-stone-500">Not carried</div>
          <div className="text-[11px] text-stone-400">
            reported {availabilitySignal.ageDays === 0 ? "today" : `${availabilitySignal.ageDays}d ago`}
          </div>
        </div>
      );
    }
    if (availabilitySignal?.availability === "OUT_OF_STOCK") {
      return (
        <div className="text-right shrink-0">
          <div className="text-sm font-medium text-red-600">Out of stock</div>
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
        <div className="text-xl font-semibold text-stone-900">
          {formatCents(latest.priceCents)}
        </div>
        <div className="text-[11px] text-stone-500">
          per can{latest.taxIncluded === false ? " +tax" : latest.taxIncluded === true ? " incl. tax" : ""}
        </div>
        {qty > 1 && effective.uncertain && (
          <div className="text-[11px] text-amber-600">deal terms unknown at {qty}</div>
        )}
      </div>
    );
  }
  return (
    <div className="text-right shrink-0">
      <div className="text-xl font-semibold text-stone-900">
        {formatCents(effective.perCanCents)}
        <span className="text-xs font-normal text-stone-500">/can</span>
      </div>
      <div className="text-[11px] text-stone-500">
        {formatCents(effective.totalCents)} for {qty}
        {effective.usedDeal && <span className="text-teal-700"> · deal applied</span>}
      </div>
    </div>
  );
}
