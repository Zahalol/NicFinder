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
  const [mode, setMode] = useState<"idle" | "dispute">("idle");
  const [lineId, setLineId] = useState(productLines[0]?.id ?? "");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("");
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!signedIn) {
    return (
      <div className="mt-6 rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-600">
        <Link href="/login" className="text-teal-700 underline">Sign in</Link> to
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error ?? "Something went wrong.");
        // A 409 CONFIRM means the shown price is stale — refresh so the next
        // attempt targets the current observation instead of looping on 409.
        if (res.status === 409) router.refresh();
      } else {
        setMsg(data.message ?? "Thanks!");
        setMode("idle");
        setPrice("");
        setQty("");
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

  return (
    <div className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
      <h2 className="font-medium text-stone-900 text-sm">Was this price right?</h2>
      {msg && <p className="mt-2 text-sm text-teal-700">{msg}</p>}
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={lineId}
          onChange={(e) => setLineId(e.target.value)}
          className="rounded-lg border border-stone-300 px-2 py-1.5 text-sm bg-white"
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
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50"
        >
          Report a different price
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
            <label className="text-sm text-stone-600 flex items-center gap-2">
              Price per can
              <input
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="6.49"
                inputMode="decimal"
                className="w-24 rounded-lg border border-stone-300 px-2 py-1.5"
              />
            </label>
            <label className="text-sm text-stone-600 flex items-center gap-2">
              Qty purchased (optional)
              <input
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="1"
                inputMode="numeric"
                className="w-16 rounded-lg border border-stone-300 px-2 py-1.5"
              />
            </label>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional note (deal details, receipt info…)"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            rows={2}
            maxLength={500}
          />
          <button
            disabled={busy}
            className="rounded-lg bg-stone-900 text-white px-4 py-2 text-sm font-medium hover:bg-stone-700 disabled:opacity-50"
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
