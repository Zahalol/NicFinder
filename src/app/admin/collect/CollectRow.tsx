"use client";

import { useState } from "react";

export interface CollectStore {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  phoneDisplay: string | null;
  lastPrice: string | null;
  lastAge: string | null;
}

export function CollectRow({
  store,
  productLineId,
}: {
  store: CollectStore;
  productLineId: string;
}) {
  const [price, setPrice] = useState("");
  const [hours, setHours] = useState("");
  const [availability, setAvailability] = useState("IN_STOCK");
  const [state, setState] = useState<"idle" | "busy" | "saved">("idle");
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setState("busy");
    setErr(null);
    const res = await fetch("/api/admin/observations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeId: store.id,
        productLineId,
        price,
        availability,
        // tax status is unknown unless the clerk states it — never asserted
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setState("idle");
      setErr(json.error ?? "Failed.");
      return;
    }
    // Hours learned on the same call ride along (best-effort).
    if (hours.trim()) {
      await fetch(`/api/admin/stores/${store.id}/details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours: hours.trim() }),
      }).catch(() => {});
    }
    setState("saved");
  }

  return (
    <tr className="border-b border-stone-100 align-top">
      <td className="py-2 pr-3">
        <div className="font-medium text-stone-900">{store.name}</div>
        <div className="text-xs text-stone-500">{store.address}</div>
      </td>
      <td className="py-2 pr-3 whitespace-nowrap">
        {store.phone ? (
          <a href={`tel:${store.phone}`} className="text-teal-700 underline">
            {store.phoneDisplay}
          </a>
        ) : (
          <span className="text-stone-400">—</span>
        )}
      </td>
      <td className="py-2 pr-3 whitespace-nowrap text-stone-500">
        {store.lastPrice ? (
          <>
            {store.lastPrice}
            <span className="text-xs text-stone-400"> · {store.lastAge}</span>
          </>
        ) : (
          <span className="text-stone-400">none</span>
        )}
      </td>
      <td className="py-2">
        {state === "saved" ? (
          <span className="text-sm text-teal-700">Saved ✓</span>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="6.49"
              inputMode="decimal"
              aria-label={`Price at ${store.name}`}
              className="w-20 rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && price) save();
              }}
            />
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              aria-label={`Availability at ${store.name}`}
              className="rounded-lg border border-stone-300 bg-white px-1.5 py-1.5 text-xs"
            >
              <option value="IN_STOCK">in stock</option>
              <option value="OUT_OF_STOCK">out of stock</option>
              <option value="NOT_CARRIED">not carried</option>
              <option value="UNKNOWN">unknown</option>
            </select>
            <input
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="hours (optional)"
              aria-label={`Opening hours at ${store.name}`}
              className="w-36 rounded-lg border border-stone-300 px-2 py-1.5 text-xs"
            />
            <button
              onClick={save}
              disabled={
                state === "busy" ||
                (!price && availability !== "NOT_CARRIED" && availability !== "OUT_OF_STOCK")
              }
              className="rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-40"
            >
              Save
            </button>
            {err && <span className="text-xs text-red-600">{err}</span>}
          </div>
        )}
      </td>
    </tr>
  );
}
