"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { StoreResult } from "@/lib/search";
import { PriceBadge, FreshnessBadge, DealBadge, DemoBadge } from "./badges";

const StoreMap = dynamic(() => import("./StoreMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] rounded-xl bg-stone-100 animate-pulse" />
  ),
});

function StoreCard({
  r,
  qty,
  productSlug,
}: {
  r: StoreResult;
  qty: number;
  productSlug: string;
}) {
  return (
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
            </div>
          )}
        </div>
        <PriceBadge result={r} qty={qty} />
      </div>
    </Link>
  );
}

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
  const [directoryOpen, setDirectoryOpen] = useState(false);

  const priced = results.filter((r) => r.latest);
  const unpriced = results.filter((r) => !r.latest);
  // When nothing has a price, show the plain directory expanded — an honest
  // "we list these stores but have no prices yet" view, not a hidden one.
  const showGrouped = priced.length > 0 && unpriced.length > 0;

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="text-sm text-stone-500">
          {priced.length > 0
            ? `${priced.length} store${priced.length === 1 ? "" : "s"} with reported prices`
            : `${results.length} store${results.length === 1 ? "" : "s"} nearby`}
          {showGrouped && (
            <span className="text-stone-400"> · {unpriced.length} more without</span>
          )}
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
          <StoreMap results={results} center={center} qty={qty} productSlug={productSlug} />
        </div>
      ) : (
        <>
          <ul className="mt-4 space-y-3">
            {(showGrouped ? priced : results).map((r) => (
              <li key={r.id}>
                <StoreCard r={r} qty={qty} productSlug={productSlug} />
              </li>
            ))}
          </ul>

          {showGrouped && (
            <div className="mt-4">
              <button
                onClick={() => setDirectoryOpen(!directoryOpen)}
                aria-expanded={directoryOpen}
                className="w-full rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-600 hover:bg-stone-100 transition flex items-center justify-between"
              >
                <span>
                  {unpriced.length} nearby store{unpriced.length === 1 ? "" : "s"} with no
                  reported price yet
                </span>
                <span className="text-stone-400">{directoryOpen ? "Hide ▴" : "Show ▾"}</span>
              </button>
              {directoryOpen && (
                <>
                  <p className="mt-2 text-xs text-stone-400 px-1">
                    We list these stores but won&apos;t guess their prices. Been there?
                    Sign in and report what you paid.
                  </p>
                  <ul className="mt-2 space-y-3">
                    {unpriced.map((r) => (
                      <li key={r.id}>
                        <StoreCard r={r} qty={qty} productSlug={productSlug} />
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
