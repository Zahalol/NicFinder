"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface LatestInfo {
  observationId: string;
  priceCents: number;
}

export function ContributePanel({
  storeId,
  productLines,
  latest,
  signedIn,
}: {
  storeId: string;
  productLines: { id: string; slug: string; name: string }[];
  latest: Record<string, LatestInfo | null>;
  signedIn: boolean;
}) {
  const router = useRouter();
  // When the store has no reported price at all, open the report form right
  // away — there is nothing to "confirm" yet.
  const [mode, setMode] = useState<"idle" | "dispute">(() =>
    Object.values(latest).every((l) => l === null) ? "dispute" : "idle"
  );
  const [lineId, setLineId] = useState(productLines[0]?.id ?? "");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!signedIn) {
    return (
      <div className="mt-6 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 text-sm text-stone-600 dark:text-stone-400">
        <Link href="/login" className="text-teal-700 dark:text-teal-400 underline">Sign in</Link> to
        confirm this price or report a different one. Browsing never requires
        an account.
      </div>
    );
  }

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/stores/${storeId}/contributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Something went wrong.");
      } else {
        setMsg(data.message ?? "Thanks!");
        setMode("idle");
        setPrice("");
        setComment("");
        router.refresh();
      }
    } catch {
      setErr("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  const currentLatest = latest[lineId] ?? null;
  const nothingReported = Object.values(latest).every((l) => l === null);

  return (
    <div className="mt-6 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
      <h2 className="font-medium text-stone-900 dark:text-stone-100 text-sm">
        {nothingReported ? "Know the price here?" : "Was this price right?"}
      </h2>
      {nothingReported && (
        <p className="mt-1 text-xs text-stone-500">
          No one has reported a price for this store yet — yours would be the
          first, and it helps everyone nearby.
        </p>
      )}
      {msg && <p className="mt-2 text-sm text-teal-700 dark:text-teal-400">{msg}</p>}
      {err && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{err}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={lineId}
          onChange={(e) => setLineId(e.target.value)}
          className="rounded-lg border border-stone-300 dark:border-stone-700 px-2 py-1.5 text-sm bg-white dark:bg-stone-900"
          aria-label="Product line"
        >
          {productLines.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <button
          disabled={busy || !currentLatest}
          title={currentLatest ? undefined : "No current price to confirm"}
          onClick={() =>
            currentLatest &&
            post({ kind: "CONFIRM", productLineId: lineId, targetObservationId: currentLatest.observationId })
          }
          className="rounded-lg bg-teal-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-teal-700 disabled:opacity-40"
        >
          ✓ Confirm current price
        </button>
        <button
          disabled={busy}
          onClick={() => setMode(mode === "dispute" ? "idle" : "dispute")}
          className="rounded-lg border border-stone-300 dark:border-stone-700 px-3 py-1.5 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
        >
          {currentLatest ? "Report a different price" : "Report a price"}
        </button>
      </div>

      {mode === "dispute" && (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            post({
              kind: "DISPUTE",
              productLineId: lineId,
              proposedPrice: price,
              proposedQty: qty ? Number(qty) : undefined,
              comment: comment || undefined,
            });
          }}
        >
          <div className="flex gap-2 flex-wrap">
            <label className="text-sm text-stone-600 dark:text-stone-400 flex items-center gap-2">
              Price per can
              <input
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="6.49"
                inputMode="decimal"
                className="w-24 rounded-lg border border-stone-300 dark:border-stone-700 px-2 py-1.5"
              />
            </label>
            <label className="text-sm text-stone-600 dark:text-stone-400 flex items-center gap-2">
              Qty purchased (optional)
              <input
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="1"
                inputMode="numeric"
                className="w-16 rounded-lg border border-stone-300 dark:border-stone-700 px-2 py-1.5"
              />
            </label>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional note (deal details, receipt info…)"
            className="w-full rounded-lg border border-stone-300 dark:border-stone-700 px-3 py-2 text-sm"
            rows={2}
            maxLength={500}
          />
          <button
            disabled={busy}
            className="rounded-lg bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 px-4 py-2 text-sm font-medium hover:bg-stone-700 dark:hover:bg-white disabled:opacity-50"
          >
            Submit price report
          </button>
          <p className="text-xs text-stone-400">
            New reports may need confirmation from other members before they
            replace the displayed price.
          </p>
        </form>
      )}
    </div>
  );
}
