"use client";

// EXPERIMENT (Cycle 4): side-by-side store comparison. Self-contained and
// purely client-side — remove this file + the compare hooks in
// SearchResults.tsx to drop the feature.

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { StoreResult } from "@/lib/search";
import { formatCents } from "@/lib/money";

function sourceLabel(s: string) {
  return s === "COMMUNITY"
    ? "community"
    : s === "CALL"
      ? "store call"
      : s === "IMPORT"
        ? "import"
        : "staff";
}

export function CompareDialog({
  stores,
  qty,
  productSlug,
  onClose,
}: {
  stores: StoreResult[];
  qty: number;
  productSlug: string;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const perCans = stores.map((s) => s.effective.perCanCents);
  const validPerCans = perCans.filter((c): c is number => c !== null);
  const bestPerCan = validPerCans.length ? Math.min(...validPerCans) : null;
  const minDistance = Math.min(...stores.map((s) => s.distanceMiles));

  const rows: Array<{
    label: string;
    render: (s: StoreResult) => React.ReactNode;
    highlight?: (s: StoreResult) => boolean;
  }> = [
    {
      label: qty > 1 ? `Per can (buying ${qty})` : "Per can",
      render: (s) =>
        s.effective.perCanCents !== null ? (
          <span className="text-lg font-semibold">{formatCents(s.effective.perCanCents)}</span>
        ) : (
          <span className="text-stone-400">—</span>
        ),
      highlight: (s) => bestPerCan !== null && s.effective.perCanCents === bestPerCan,
    },
    ...(qty > 1
      ? [
          {
            label: `Total for ${qty}`,
            render: (s: StoreResult) =>
              s.effective.totalCents !== null ? formatCents(s.effective.totalCents) : "—",
          },
        ]
      : []),
    {
      label: "Multi-can deal",
      render: (s) =>
        s.deal ? (
          <span className="text-teal-800 dark:text-teal-300">
            {s.deal.minQty}+ cans:{" "}
            {s.deal.pricePerCanCents !== null
              ? `${formatCents(s.deal.pricePerCanCents)} each`
              : `${formatCents(s.deal.discountPerCanCents)} off each`}
          </span>
        ) : (
          <span className="text-stone-400">none reported</span>
        ),
    },
    {
      label: "Distance",
      render: (s) => `${s.distanceMiles} mi`,
      highlight: (s) => s.distanceMiles === minDistance,
    },
    {
      label: "Price updated",
      render: (s) =>
        s.latest ? (
          s.latest.freshness === "stale" ? (
            <span className="text-amber-700 dark:text-amber-400">{s.latest.ageDays}d ago (may be outdated)</span>
          ) : (
            `${s.latest.ageDays === 0 ? "today" : `${s.latest.ageDays}d ago`}`
          )
        ) : (
          <span className="text-stone-400">never</span>
        ),
    },
    {
      label: "Source",
      render: (s) => (s.latest ? sourceLabel(s.latest.sourceType) : "—"),
    },
    {
      label: "Confirmations",
      render: (s) =>
        s.latest && s.latest.confirmCount > 0 ? (
          <span className="text-teal-700 dark:text-teal-400">✓ {s.latest.confirmCount}</span>
        ) : (
          <span className="text-stone-400">none yet</span>
        ),
    },
    {
      label: "Stock",
      render: (s) =>
        s.latest?.availability === "OUT_OF_STOCK" ? (
          <span className="text-red-600 dark:text-red-400">reported out</span>
        ) : s.latest ? (
          "in stock at last report"
        ) : (
          "—"
        ),
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-900/50 flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Compare stores"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-stone-900 w-full sm:max-w-3xl max-h-[85vh] overflow-auto rounded-t-2xl sm:rounded-2xl shadow-xl"
      >
        <div className="sticky top-0 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-4 py-3 flex items-center justify-between">
          <h2 className="font-semibold text-stone-900 dark:text-stone-100">Compare stores</h2>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close comparison"
            className="rounded-lg px-2.5 py-1 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <table className={`w-full text-sm ${stores.length >= 3 ? "min-w-[560px]" : ""}`}>
          <thead>
            <tr>
              <th className="w-28 sm:w-36" aria-label="Attribute" />
              {stores.map((s) => (
                <th key={s.id} className="px-3 pt-3 pb-2 text-left align-top font-normal">
                  <Link
                    href={`/stores/${s.id}?product=${productSlug}`}
                    className="font-medium text-stone-900 dark:text-stone-100 hover:text-teal-700 underline-offset-2 hover:underline"
                  >
                    {s.name}
                  </Link>
                  {s.isDemo && (
                    <span className="ml-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[9px] font-medium px-1 py-0.5 uppercase align-middle">
                      demo
                    </span>
                  )}
                  <p className="text-xs text-stone-500 font-normal mt-0.5">{s.address}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-stone-100 dark:border-stone-800">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-stone-400 align-top">
                  {row.label}
                </th>
                {stores.map((s) => (
                  <td
                    key={s.id}
                    className={`px-3 py-2.5 align-top ${
                      row.highlight?.(s) ? "bg-teal-50 dark:bg-teal-950/70 text-teal-900 dark:text-teal-200" : "text-stone-700 dark:text-stone-300"
                    }`}
                  >
                    {row.render(s)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-4 py-3 text-[11px] text-stone-400 border-t border-stone-100 dark:border-stone-800">
          Prices are member/staff reports, may exclude tax, and can be out of
          date — the highlighted cells are the best value in this comparison.
        </p>
      </div>
    </div>
  );
}
