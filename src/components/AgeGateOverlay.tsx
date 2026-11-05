"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Full-screen 21+ overlay. Rendered by the server layout whenever the age
 * cookie is absent. Page content stays in the DOM (so search engines can
 * index public pages), but the overlay blocks all interaction until the
 * visitor confirms — the standard pattern for age-restricted informational
 * content.
 */
export function AgeGateOverlay() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <div
      className="fixed inset-0 z-[100] bg-stone-900/70 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
    >
      <div className="max-w-md w-full rounded-2xl bg-white dark:bg-stone-900 p-8 shadow-xl text-center">
        <h1 id="age-gate-title" className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
          Adults 21+ only
        </h1>
        <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
          NicFinder shows information about nicotine pouch prices. Nicotine
          products are age-restricted. You must be 21 years of age or older
          to use this site.
        </p>
        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
          This site is informational only — we do not sell nicotine products.
          Nicotine is addictive.
        </p>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await fetch("/api/age", { method: "POST" });
            router.refresh();
          }}
          className="mt-6 w-full rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 py-3 font-medium hover:bg-stone-700 dark:hover:bg-stone-300 disabled:opacity-50"
        >
          I am 21 or older — enter
        </button>
        <a
          href="https://www.fda.gov/tobacco-products"
          className="mt-4 inline-block text-xs text-stone-400 underline"
          rel="noopener noreferrer"
        >
          I am under 21 — learn about nicotine risks
        </a>
      </div>
    </div>
  );
}
