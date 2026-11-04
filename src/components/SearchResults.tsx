"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { StoreResult } from "@/lib/search";
import { computeTripValues, toComparable } from "@/lib/trip-value";
import { formatCents } from "@/lib/money";
import { PriceBadge, FreshnessBadge, DealBadge, DemoBadge } from "./badges";

const StoreMap = dynamic(() => import("./StoreMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] rounded-xl bg-stone-100 animate-pulse" />
  ),
});

export function SearchResults({
  results,
  center,
  qty,
  productSlug,
}: {
  results: StoreResult[];
  center: { lat: number; lng: number };
  qty: number;
  productSlug: string;
}) {
  const [view, setView] = useState<"list" | "map">("list");
  const tripValues = useMemo(
    () => computeTripValues(results.map(toComparable)),
    [results]
  );

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">
          {results.length} store{results.length === 1 ? "" : "s"} ·{" "}
          {results.filter((r) => r.latest).length} with reported prices
        </p>
        <div className="inline-flex rounded-lg border border-stone-300 overflow-hidden text-sm">
          <button
            onClick={() => setView("list")}
            className={`px-4 py-1.5 ${view === "list" ? "bg-stone-900 text-white" : "bg-white text-stone-600"}`}
          >
            List
          </button>
          <button
            onClick={() => setView("map")}
            className={`px-4 py-1.5 ${view === "map" ? "bg-stone-900 text-white" : "bg-white text-stone-600"}`}
          >
            Map
          </button>
        </div>
      </div>

      {view === "map" ? (
        <div className="mt-4 h-[420px]">
          <StoreMap results={results} center={center} qty={qty} />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {results.map((r) => (
            <li key={r.id}>
              <Link
                href={`/stores/${r.id}?product=${productSlug}`}
                className="block rounded-xl border border-stone-200 bg-white p-4 hover:border-teal-400 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-stone-900 truncate">{r.name}</h3>
                      {r.isDemo && <DemoBadge />}
                      {r.deal && <DealBadge deal={r.deal} />}
                    </div>
                    <p className="mt-0.5 text-sm text-stone-500 truncate">
                      {r.address ? `${r.address}, ` : ""}
                      {r.city ?? ""} · {r.distanceMiles} mi
                    </p>
                    {r.latest && (
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-stone-500 flex-wrap">
                        <FreshnessBadge latest={r.latest} />
                        <span>
                          {r.latest.sourceType === "COMMUNITY"
                            ? "community-reported"
                            : r.latest.sourceType === "CALL"
                              ? "store call"
                              : r.latest.sourceType === "IMPORT"
                                ? "data import"
                                : "staff-entered"}
                        </span>
                        {r.latest.confirmCount > 0 && (
                          <span className="text-teal-700">
                            ✓ {r.latest.confirmCount} confirm{r.latest.confirmCount > 1 ? "s" : ""}
                          </span>
                        )}
                        {r.latest.availability === "OUT_OF_STOCK" && (
                          <span className="text-red-600">reported out of stock</span>
                        )}
                        {r.availabilitySignal && (
                          <span className={r.availabilitySignal.availability === "NOT_CARRIED" ? "text-stone-500" : "text-red-600"}>
                            {r.availabilitySignal.availability === "NOT_CARRIED"
                              ? "newer report: not carried"
                              : "newer report: out of stock"}
                          </span>
                        )}
                      </div>
                    )}
                    {!r.latest && r.availabilitySignal && (
                      <div className="mt-1.5 text-xs text-stone-500">
                        {r.availabilitySignal.availability === "NOT_CARRIED"
                          ? "Reported as not carrying this product"
                          : "Reported out of stock"}{" "}
                        · {r.availabilitySignal.ageDays === 0 ? "today" : `${r.availabilitySignal.ageDays}d ago`}
                      </div>
                    )}
                    {tripValues.has(r.id) && (
                      <div className="mt-1.5 text-xs text-teal-700">
                        Saves {formatCents(tripValues.get(r.id)!.savingsCents)} on {qty} can{qty === 1 ? "" : "s"} vs{" "}
                        {tripValues.get(r.id)!.baselineName} — {tripValues.get(r.id)!.extraMiles} mi farther
                      </div>
                    )}
                  </div>
                  <PriceBadge result={r} qty={qty} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {view === "list" && tripValues.size > 0 && (
        <p className="mt-3 text-[11px] text-stone-400">
          “Saves … vs …” compares can cost at your chosen quantity against the
          nearest store with a definite price. Distances are straight-line;
          fuel and time aren’t estimated.
        </p>
      )}
    </div>
  );
}
