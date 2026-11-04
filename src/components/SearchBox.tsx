"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
        placeholder="ZIP code or address (e.g. 60614)"
        className="flex-1 rounded-xl border border-stone-300 bg-white px-4 py-3 text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        aria-label="Search by ZIP code or address"
      />
      <button
        type="submit"
        className="rounded-xl bg-teal-600 text-white px-5 py-3 font-medium hover:bg-teal-700"
      >
        Search
      </button>
      <button
        type="button"
        onClick={useMyLocation}
        title="Use my location"
        aria-label="Use my location"
        className="rounded-xl border border-stone-300 bg-white px-3 text-stone-600 hover:bg-stone-50"
      >
        {locating ? "…" : "📍"}
      </button>
    </form>
  );
}
