"use client";

import { useState } from "react";
import Link from "next/link";

export interface WatchItem {
  storeId: string;
  name: string;
  address: string | null;
  priceLabel: string | null;
  priceMeta: string | null;
}

/** Watchlist with a two-store compare picker (same pattern as search). */
export function WatchlistCompare({ items }: { items: WatchItem[] }) {
  const [picked, setPicked] = useState<string[]>([]);
  function toggle(id: string) {
    setPicked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev.slice(-1), id].slice(-2)
    );
  }
  const compareHref =
    picked.length === 2 ? `/compare?a=${picked[0]}&b=${picked[1]}&qty=5` : null;

  return (
    <>
      <ul className="mt-2 divide-y divide-stone-100 dark:divide-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900">
        {items.map((s) => (
          <li key={s.storeId} className="p-3 text-sm flex items-center justify-between gap-2">
            <span className="min-w-0">
              <Link
                href={`/stores/${s.storeId}`}
                className="text-teal-700 dark:text-teal-400 hover:underline font-medium"
              >
                {s.name}
              </Link>{" "}
              <span className="text-stone-500 dark:text-stone-400">{s.address}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2 text-stone-700 dark:text-stone-300">
              {s.priceLabel ? (
                <span>
                  {s.priceLabel}
                  {s.priceMeta && <span className="text-xs text-stone-400"> · {s.priceMeta}</span>}
                </span>
              ) : (
                <span className="text-stone-400">no price yet</span>
              )}
              {items.length >= 2 && (
                <button
                  onClick={() => toggle(s.storeId)}
                  aria-pressed={picked.includes(s.storeId)}
                  className={`rounded border px-1.5 py-0.5 text-[11px] ${
                    picked.includes(s.storeId)
                      ? "border-teal-600 bg-teal-600 text-white"
                      : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-400 hover:border-stone-300 hover:text-stone-600"
                  }`}
                >
                  {picked.includes(s.storeId) ? "✓" : "compare"}
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
      {picked.length > 0 && (
        <p className="mt-2 text-sm">
          {compareHref ? (
            <Link
              href={compareHref}
              className="rounded-lg bg-teal-600 px-3 py-1.5 font-medium text-white hover:bg-teal-700"
            >
              Compare side-by-side
            </Link>
          ) : (
            <span className="text-stone-500 dark:text-stone-400">Pick one more saved store to compare.</span>
          )}
        </p>
      )}
    </>
  );
}
