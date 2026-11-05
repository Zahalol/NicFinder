"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { StoreResult } from "@/lib/search";
import { computeTripValues, toComparable } from "@/lib/trip-value";
import { formatCents } from "@/lib/money";
import { PriceBadge, FreshnessBadge, DealBadge, DemoBadge, ReliabilityBadge } from "./badges";

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
  initialPricedOnly = false,
}: {
  results: StoreResult[];
  center: { lat: number; lng: number };
  qty: number;
  productSlug: string;
  initialPricedOnly?: boolean;
}) {
  const [view, setView] = useState<"list" | "map">("list");
  const [pricedOnly, setPricedOnlyState] = useState(initialPricedOnly);
  // Keep the filter in the URL (?priced=1) so refreshes and shared links
  // preserve it — history.replaceState avoids a server round-trip.
  function setPricedOnly(update: (v: boolean) => boolean) {
    setPricedOnlyState((v) => {
      const next = update(v);
      try {
        const url = new URL(window.location.href);
        if (next) url.searchParams.set("priced", "1");
        else url.searchParams.delete("priced");
        window.history.replaceState(null, "", url.toString());
      } catch {}
      return next;
    });
  }
  // Two-store comparison picker (max 2; picking a third swaps the oldest out).
  const [compareIds, setCompareIds] = useState<string[]>([]);
  function toggleCompare(id: string) {
    setCompareIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev.slice(-1), id].slice(-2)
    );
  }
  const compareHref =
    compareIds.length === 2
      ? `/compare?a=${compareIds[0]}&b=${compareIds[1]}&qty=${Math.max(qty, 1)}&lat=${center.lat}&lng=${center.lng}`
      : null;
  const tripValues = useMemo(
    () => computeTripValues(results.map(toComparable)),
    [results]
  );
  const pricedCount = results.filter((r) => r.latest).length;
  // "Priced only" keeps availability-signal stores visible: "not carried"
  // is information, hiding it would misrepresent coverage.
  const visible =
    pricedOnly && pricedCount > 0
      ? results.filter((r) => r.latest || r.availabilitySignal)
      : results;

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-stone-500">
          {results.length} store{results.length === 1 ? "" : "s"} ·{" "}
          {pricedCount} with reported prices
        </p>
        <div className="flex items-center gap-2">
          {pricedCount > 0 && pricedCount < results.length && (
            <button
              onClick={() => setPricedOnly((v) => !v)}
              aria-pressed={pricedOnly}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                pricedOnly
                  ? "border-teal-600 bg-teal-600 text-white"
                  : "border-stone-300 bg-white text-stone-600 hover:bg-stone-50"
              }`}
            >
              Priced only
            </button>
          )}
          <div className="inline-flex rounded-lg border border-stone-300 overflow-hidden text-sm" role="group" aria-label="Result view">
            <button
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              className={`px-4 py-1.5 ${view === "list" ? "bg-stone-900 text-white" : "bg-white text-stone-600"}`}
            >
              List
            </button>
            <button
              onClick={() => setView("map")}
              aria-pressed={view === "map"}
              className={`px-4 py-1.5 ${view === "map" ? "bg-stone-900 text-white" : "bg-white text-stone-600"}`}
            >
              Map
            </button>
          </div>
        </div>
      </div>

      {view === "map" ? (
        <div className="mt-4 h-[420px]">
          <StoreMap results={results} center={center} qty={qty} />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {visible.map((r) => (
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
                        <ReliabilityBadge reliability={r.latest.reliability} />
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
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <PriceBadge result={r} qty={qty} />
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleCompare(r.id);
                      }}
                      aria-pressed={compareIds.includes(r.id)}
                      className={`rounded border px-1.5 py-0.5 text-[11px] ${
                        compareIds.includes(r.id)
                          ? "border-teal-600 bg-teal-600 text-white"
                          : "border-stone-200 bg-white text-stone-400 hover:text-stone-600 hover:border-stone-300"
                      }`}
                    >
                      {compareIds.includes(r.id) ? "✓ comparing" : "compare"}
                    </button>
                  </div>
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
      {compareIds.length > 0 && (
        <div className="sticky bottom-3 z-30 mt-4 flex justify-center">
          <div className="flex items-center gap-3 rounded-full border border-stone-300 bg-white/95 px-4 py-2 text-sm shadow-lg backdrop-blur">
            {compareHref ? (
              <>
                <span className="text-stone-600">2 stores selected</span>
                <Link
                  href={compareHref}
                  className="rounded-full bg-teal-600 px-3 py-1 font-medium text-white hover:bg-teal-700"
                >
                  Compare side-by-side
                </Link>
              </>
            ) : (
              <span className="text-stone-500">Pick one more store to compare</span>
            )}
            <button
              onClick={() => setCompareIds([])}
              className="text-xs text-stone-400 underline hover:text-stone-600"
            >
              clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
