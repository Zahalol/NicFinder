"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { StoreResult } from "@/lib/search";
import { computeTripValues, toComparable } from "@/lib/trip-value";
import { formatCents } from "@/lib/money";
import { PriceBadge, FreshnessBadge, DealBadge, DemoBadge, ReliabilityBadge } from "./badges";

const StoreMap = dynamic(() => import("./StoreMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] rounded-xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
  ),
});

// One-tap "still this price?" confirmation for
// signed-in members, straight from the results list.
function QuickConfirm({
  storeId,
  productLineId,
  observationId,
}: {
  storeId: string;
  productLineId: string;
  observationId: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  async function confirm(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (state === "busy" || state === "done") return;
    setState("busy");
    try {
      const res = await fetch(`/api/stores/${storeId}/contributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "CONFIRM",
          productLineId,
          targetObservationId: observationId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setState("done");
        router.refresh();
      } else {
        setState("error");
        setMsg(data.error ?? "Couldn’t record that.");
      }
    } catch {
      setState("error");
      setMsg("Network error.");
    }
  }

  if (state === "error")
    return (
      <span role="alert" className="text-[11px] text-stone-400 dark:text-stone-500" title={msg ?? undefined}>
        {msg}
      </span>
    );
  return (
    <button
      onClick={confirm}
      disabled={state !== "idle"}
      aria-live="polite"
      className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition ${
        state === "done"
          ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          : "border-stone-300 dark:border-stone-600 text-stone-500 dark:text-stone-400 hover:border-teal-400 hover:text-teal-700 dark:hover:text-teal-400"
      }`}
      aria-label="Confirm this price is still right"
    >
      {state === "done" ? "Thanks ✓" : state === "busy" ? "…" : "✓ Still this price?"}
    </button>
  );
}

export function SearchResults({
  results,
  center,
  qty,
  productSlug,
  initialPricedOnly = false,
  signedIn = false,
  initialSavedIds = [],
  productLineId = null,
}: {
  results: StoreResult[];
  center: { lat: number; lng: number };
  qty: number;
  productSlug: string;
  initialPricedOnly?: boolean;
  signedIn?: boolean;
  initialSavedIds?: string[];
  /** Active product line (needed for one-tap confirmations). */
  productLineId?: string | null;
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
  const [nameFilter, setNameFilter] = useState("");
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set(initialSavedIds));
  async function toggleSave(id: string) {
    const isSaved = savedIds.has(id);
    const res = await fetch(`/api/stores/${id}/save`, {
      method: isSaved ? "DELETE" : "POST",
    }).catch(() => null);
    if (res?.ok) {
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (isSaved) next.delete(id);
        else next.add(id);
        return next;
      });
    }
  }
  const pricedCount = results.filter((r) => r.latest).length;
  // "Priced only" keeps availability-signal stores visible: "not carried"
  // is information, hiding it would misrepresent coverage.
  const base =
    pricedOnly && pricedCount > 0
      ? results.filter((r) => r.latest || r.availabilitySignal)
      : results;
  const needle = nameFilter.trim().toLowerCase();
  const visible = needle
    ? base.filter(
        (r) =>
          r.name.toLowerCase().includes(needle) ||
          (r.address ?? "").toLowerCase().includes(needle)
      )
    : base;

  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-stone-500 dark:text-stone-400">
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
                  : "border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800"
              }`}
            >
              Priced only
            </button>
          )}
          <div className="inline-flex rounded-lg border border-stone-300 dark:border-stone-600 overflow-hidden text-sm" role="group" aria-label="Result view">
            <button
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              className={`px-4 py-1.5 ${view === "list" ? "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900" : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400"}`}
            >
              List
            </button>
            <button
              onClick={() => setView("map")}
              aria-pressed={view === "map"}
              className={`px-4 py-1.5 ${view === "map" ? "bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900" : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400"}`}
            >
              Map
            </button>
          </div>
        </div>
      </div>

      {view === "list" && results.length > 8 && (
        <input
          value={nameFilter}
          onChange={(e) => setNameFilter(e.target.value)}
          placeholder="Filter by store name or street…"
          aria-label="Filter results by store name or street"
          className="mt-3 w-full max-w-xs rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 py-1.5 text-sm"
        />
      )}
      {view === "list" && needle && visible.length === 0 && (
        <p className="mt-3 text-sm text-stone-400">
          No stores match “{nameFilter.trim()}” here.
        </p>
      )}
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
                className="block rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-4 hover:border-teal-400 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-stone-900 dark:text-stone-100 truncate">{r.name}</h3>
                      {r.isDemo && <DemoBadge />}
                      {r.deal && <DealBadge deal={r.deal} />}
                    </div>
                    <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400 truncate">
                      {r.address ? `${r.address}, ` : ""}
                      {r.city ?? ""} · {r.distanceMiles} mi
                    </p>
                    {r.latest && (
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 flex-wrap">
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
                          <span className="text-teal-700 dark:text-teal-400">
                            ✓ {r.latest.confirmCount} confirm{r.latest.confirmCount > 1 ? "s" : ""}
                          </span>
                        )}
                        {r.latest.availability === "OUT_OF_STOCK" && (
                          <span className="text-red-600 dark:text-red-400">reported out of stock</span>
                        )}
                        {signedIn && productLineId && (
                          <QuickConfirm
                            storeId={r.id}
                            productLineId={productLineId}
                            observationId={r.latest.observationId}
                          />
                        )}
                        {r.availabilitySignal && (
                          <span className={r.availabilitySignal.availability === "NOT_CARRIED" ? "text-stone-500 dark:text-stone-400" : "text-red-600 dark:text-red-400"}>
                            {r.availabilitySignal.availability === "NOT_CARRIED"
                              ? "newer report: not carried"
                              : "newer report: out of stock"}
                          </span>
                        )}
                      </div>
                    )}
                    {!r.latest && r.availabilitySignal && (
                      <div className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
                        {r.availabilitySignal.availability === "NOT_CARRIED"
                          ? "Reported as not carrying this product"
                          : "Reported out of stock"}{" "}
                        · {r.availabilitySignal.ageDays === 0 ? "today" : `${r.availabilitySignal.ageDays}d ago`}
                      </div>
                    )}
                    {tripValues.has(r.id) && (
                      <div className="mt-1.5 text-xs text-teal-700 dark:text-teal-400">
                        Saves {formatCents(tripValues.get(r.id)!.savingsCents)} on {qty} can{qty === 1 ? "" : "s"} vs{" "}
                        {tripValues.get(r.id)!.baselineName} — {tripValues.get(r.id)!.extraMiles} mi farther
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <PriceBadge result={r} qty={qty} />
                    {signedIn && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleSave(r.id);
                        }}
                        aria-pressed={savedIds.has(r.id)}
                        title={savedIds.has(r.id) ? "Remove from watchlist" : "Save to watchlist (price alerts)"}
                        className={`rounded border px-1.5 py-0.5 text-[11px] ${
                          savedIds.has(r.id)
                            ? "border-amber-400 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400"
                            : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-400 hover:border-stone-300 hover:text-stone-600"
                        }`}
                      >
                        {savedIds.has(r.id) ? "★ saved" : "☆ save"}
                      </button>
                    )}
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
                          : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-400 hover:text-stone-600 hover:border-stone-300"
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
          <div className="flex items-center gap-3 rounded-full border border-stone-300 dark:border-stone-600 bg-white/95 dark:bg-stone-900/95 px-4 py-2 text-sm shadow-lg backdrop-blur">
            {compareHref ? (
              <>
                <span className="text-stone-600 dark:text-stone-400">2 stores selected</span>
                <Link
                  href={compareHref}
                  className="rounded-full bg-teal-600 px-3 py-1 font-medium text-white hover:bg-teal-700"
                >
                  Compare side-by-side
                </Link>
              </>
            ) : (
              <span className="text-stone-500 dark:text-stone-400">Pick one more store to compare</span>
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
