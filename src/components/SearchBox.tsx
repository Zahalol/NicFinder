"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { rememberSearch } from "./QuickSearches";

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
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" focuses the search box (unless already typing somewhere).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (t?.isContentEditable) return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Follow URL-driven changes (back/forward, "use my location") — useState
  // ignores later prop values, leaving a query that doesn't match results.
  useEffect(() => setQ(initialQuery), [initialQuery]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const query = q.trim();
    if (!query) return;
    rememberSearch(query);
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
        ref={inputRef}
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus={autoFocus}
        placeholder="ZIP or address"
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
        className="shrink-0 rounded-xl border border-stone-300 bg-white px-3 text-stone-600 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800"
      >
        {locating ? (
          <span aria-hidden>…</span>
        ) : (
          <svg
            aria-hidden
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            <circle cx="12" cy="12" r="8" />
          </svg>
        )}
      </button>
    </form>
  );
}
