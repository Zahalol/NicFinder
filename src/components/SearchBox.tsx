"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function SearchBox({
  initialQuery = "",
  autoFocus = false,
}: {
  initialQuery?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [locating, setLocating] = useState(false);

  // Follow URL-driven changes (back/forward, "use my location") — useState
  // ignores later prop values, leaving a query that doesn't match results.
  useEffect(() => setQ(initialQuery), [initialQuery]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const query = q.trim();
    if (!query) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        router.push(
          `/search?lat=${pos.coords.latitude.toFixed(5)}&lng=${pos.coords.longitude.toFixed(5)}`
        );
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  }

  return (
    <form onSubmit={submit} className="flex gap-2 max-w-xl mx-auto">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus={autoFocus}
        placeholder="ZIP code or address"
        inputMode="text"
        autoComplete="postal-code"
        className="flex-1 min-w-0 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        aria-label="Search by ZIP code or address"
      />
      <button
        type="submit"
        className="shrink-0 rounded-xl bg-teal-600 text-white px-4 sm:px-5 py-3 font-medium hover:bg-teal-700"
      >
        Search
      </button>
      <button
        type="button"
        onClick={useMyLocation}
        title="Use my location"
        aria-label="Use my location"
        className="shrink-0 rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 px-3 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800"
      >
        {locating ? "…" : "📍"}
      </button>
    </form>
  );
}
