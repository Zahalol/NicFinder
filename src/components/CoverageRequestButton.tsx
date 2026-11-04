"use client";

import { useState } from "react";

export function CoverageRequestButton({
  zip,
  lat,
  lng,
  initialCount,
}: {
  zip?: string | null;
  lat?: number | null;
  lng?: number | null;
  initialCount: number;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function request() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/coverage-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zip: zip ?? undefined, lat: lat ?? undefined, lng: lng ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Something went wrong.");
      } else {
        setMsg(data.message);
        setDone(true);
      }
    } catch {
      setErr("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      {done ? (
        <p className="text-sm text-teal-700 dark:text-teal-400 font-medium">{msg}</p>
      ) : (
        <>
          <button
            onClick={request}
            disabled={busy}
            className="rounded-xl bg-teal-600 text-white px-5 py-2.5 font-medium hover:bg-teal-700 disabled:opacity-50"
          >
            {busy ? "Sending…" : "📍 Request prices for this area"}
          </button>
          <p className="mt-2 text-xs text-stone-500">
            {initialCount > 0
              ? `${initialCount} ${initialCount === 1 ? "person has" : "people have"} asked for this area. We prioritize coverage by demand.`
              : "Be the first to request this area — we prioritize coverage by demand."}
          </p>
          {err && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{err}</p>}
        </>
      )}
    </div>
  );
}
