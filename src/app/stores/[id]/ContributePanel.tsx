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
  const [mode, setMode] = useState<"idle" | "dispute" | "deal">("idle");
  const [dealQty, setDealQty] = useState("5");
  const [dealPrice, setDealPrice] = useState("");
  const [dealDiscount, setDealDiscount] = useState("");
  const [dealConditions, setDealConditions] = useState("");
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
        <button
          disabled={busy}
          onClick={() => setMode(mode === "deal" ? "idle" : "deal")}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50"
        >
          Report a multi-can deal
        </button>
      </div>

      {mode === "deal" && (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            post({
              kind: "REPORT_DEAL",
              productLineId: lineId,
              minQty: Number(dealQty),
              dealPrice: dealPrice || null,
              dealDiscount: dealDiscount || null,
              conditions: dealConditions || undefined,
            });
          }}
        >
          <div className="flex gap-2 flex-wrap items-end">
            <label className="text-sm text-stone-600 flex items-center gap-2">
              Buy at least
              <input
                required
                value={dealQty}
                onChange={(e) => setDealQty(e.target.value)}
                inputMode="numeric"
                className="w-14 rounded-lg border border-stone-300 px-2 py-1.5"
              />
              cans
            </label>
            <label className="text-sm text-stone-600 flex items-center gap-2">
              at
              <input
                value={dealPrice}
                onChange={(e) => {
                  setDealPrice(e.target.value);
                  if (e.target.value) setDealDiscount("");
                }}
                placeholder="5.99"
                inputMode="decimal"
                className="w-20 rounded-lg border border-stone-300 px-2 py-1.5"
              />
              /can
            </label>
            <span className="text-xs text-stone-400">or</span>
            <label className="text-sm text-stone-600 flex items-center gap-2">
              <input
                value={dealDiscount}
                onChange={(e) => {
                  setDealDiscount(e.target.value);
                  if (e.target.value) setDealPrice("");
                }}
                placeholder="1.00"
                inputMode="decimal"
                className="w-20 rounded-lg border border-stone-300 px-2 py-1.5"
              />
              off each
            </label>
          </div>
          <input
            value={dealConditions}
            onChange={(e) => setDealConditions(e.target.value)}
            placeholder="Conditions (loyalty card, specific flavors…) — optional"
            maxLength={300}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <button
            disabled={busy || !dealQty || (!dealPrice && !dealDiscount)}
            className="rounded-lg bg-stone-900 text-white px-4 py-2 text-sm font-medium hover:bg-stone-700 disabled:opacity-50"
          >
            Submit deal report
          </button>
          <p className="text-xs text-stone-400">
            A moderator reviews deal reports before they appear — deal math is
            easy to get wrong, so we double-check.
          </p>
        </form>
      )}

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
