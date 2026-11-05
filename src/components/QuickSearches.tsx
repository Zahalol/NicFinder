"use client";

// EXPERIMENT (Cycle 7): quick-search chips under the search box — "near me",
// the visitor's recent searches (localStorage only, device-private), and
// popular pilot-area neighborhoods. Remove this file + its two call sites
// to drop the feature.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export const RECENT_KEY = "nf_recent_searches";
const MAX_RECENT = 5;

export function rememberSearch(q: string) {
  try {
    const cur: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    const next = [q, ...cur.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(
      0,
      MAX_RECENT
    );
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // private mode / blocked storage — recents are a nicety, not a need
  }
}

export function QuickSearches({
  popular = [],
}: {
  popular?: { q: string; label: string }[];
}) {
  const router = useRouter();
  const [recent, setRecent] = useState<string[]>([]);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    try {
      setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"));
    } catch {
      /* ignore */
    }
  }, []);

  function nearMe() {
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

  function clearRecent() {
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      /* ignore */
    }
    setRecent([]);
  }

  const chip =
    "rounded-full border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-1.5 text-sm text-stone-600 dark:text-stone-400 hover:border-teal-400 hover:text-teal-700 transition";

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
      <button onClick={nearMe} className={`${chip} font-medium`} disabled={locating}>
        {locating ? "Locating…" : "⌖ Near me"}
      </button>

      {recent.length > 0 && (
        <>
          {recent.map((q) => (
            <button
              key={q}
              onClick={() => router.push(`/search?q=${encodeURIComponent(q)}`)}
              className={chip}
              title={`Search ${q} again`}
            >
              {q}
            </button>
          ))}
          <button
            onClick={clearRecent}
            className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 px-1"
            title="Clear recent searches (stored only on this device)"
          >
            clear
          </button>
        </>
      )}

      {recent.length === 0 &&
        popular.map((p) => (
          <button
            key={p.q}
            onClick={() => router.push(`/search?q=${encodeURIComponent(p.q)}`)}
            className={chip}
          >
            {p.label}
          </button>
        ))}
    </div>
  );
}
