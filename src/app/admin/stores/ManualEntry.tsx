"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client/api";

export function ManualEntry({
  stores,
  productLines,
}: {
  stores: { id: string; name: string; address: string | null }[];
  productLines: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState<"none" | "price" | "store">("none");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function post(url: string, body: Record<string, unknown>) {
    if (busy) return false; // double-submit guard (two identical POSTs = two observations/stores)
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await apiFetch(url, { body });
    setBusy(false);
    if (!res.ok) { setErr(res.error); return false; }
    setMsg("Saved.");
    router.refresh();
    return true;
  }

  return (
    <div className="mt-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-4">
      <div className="flex gap-2 text-sm">
        <button
          onClick={() => setOpen(open === "price" ? "none" : "price")}
          className="rounded-lg border border-stone-300 dark:border-stone-600 px-3 py-1.5 hover:bg-stone-50 dark:hover:bg-stone-800"
        >
          + Manual price entry
        </button>
        <button
          onClick={() => setOpen(open === "store" ? "none" : "store")}
          className="rounded-lg border border-stone-300 dark:border-stone-600 px-3 py-1.5 hover:bg-stone-50 dark:hover:bg-stone-800"
        >
          + New store
        </button>
        {msg && <span className="text-teal-700 dark:text-teal-400 self-center">{msg}</span>}
        {err && <span className="text-red-600 dark:text-red-400 self-center">{err}</span>}
      </div>

      {open === "price" && (
        <form
          className="mt-3 flex flex-wrap gap-2 items-center text-sm"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const ok = await post("/api/admin/observations", {
              storeId: f.get("storeId"),
              productLineId: f.get("productLineId"),
              price: f.get("price"),
              availability: f.get("availability"),
              notes: f.get("notes"),
            });
            if (ok) (e.target as HTMLFormElement).reset();
          }}
        >
          <select name="storeId" required aria-label="Store" className="rounded-lg border border-stone-300 dark:border-stone-600 px-2 py-1.5 max-w-60 bg-white dark:bg-stone-900">
            <option value="">Store…</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name} — {s.address}</option>
            ))}
          </select>
          <select name="productLineId" required aria-label="Product line" className="rounded-lg border border-stone-300 dark:border-stone-600 px-2 py-1.5 bg-white dark:bg-stone-900">
            {productLines.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <input name="price" required placeholder="6.49" aria-label="Price in dollars" inputMode="decimal" className="w-20 rounded-lg border border-stone-300 dark:border-stone-600 px-2 py-1.5" />
          <select name="availability" aria-label="Availability" className="rounded-lg border border-stone-300 dark:border-stone-600 px-2 py-1.5 bg-white dark:bg-stone-900">
            <option value="IN_STOCK">in stock</option>
            <option value="OUT_OF_STOCK">out of stock</option>
            <option value="NOT_CARRIED">not carried</option>
            <option value="UNKNOWN">unknown</option>
          </select>
          <input name="notes" placeholder="note (optional)" aria-label="Note" className="rounded-lg border border-stone-300 dark:border-stone-600 px-2 py-1.5 w-48" />
          <button disabled={busy} className="rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-3 py-1.5 disabled:opacity-50">Save</button>
        </form>
      )}

      {open === "store" && (
        <form
          className="mt-3 flex flex-wrap gap-2 items-center text-sm"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const ok = await post("/api/admin/stores", {
              name: f.get("name"),
              address: f.get("address"),
              city: f.get("city"),
              state: f.get("state"),
              zip: f.get("zip"),
              latitude: f.get("latitude"),
              longitude: f.get("longitude"),
              phone: f.get("phone"),
            });
            if (ok) (e.target as HTMLFormElement).reset();
          }}
        >
          <input name="name" aria-label="Store name" required placeholder="Name" className="rounded-lg border border-stone-300 dark:border-stone-600 px-2 py-1.5" />
          <input name="address" aria-label="Street address" placeholder="Street address" className="rounded-lg border border-stone-300 dark:border-stone-600 px-2 py-1.5 w-56" />
          <input name="city" aria-label="City" placeholder="City" className="rounded-lg border border-stone-300 dark:border-stone-600 px-2 py-1.5 w-28" />
          <input name="state" aria-label="State" placeholder="IL" maxLength={2} className="rounded-lg border border-stone-300 dark:border-stone-600 px-2 py-1.5 w-12" />
          <input name="zip" aria-label="ZIP code" placeholder="ZIP" className="rounded-lg border border-stone-300 dark:border-stone-600 px-2 py-1.5 w-20" />
          <input name="latitude" aria-label="Latitude" placeholder="lat" className="rounded-lg border border-stone-300 dark:border-stone-600 px-2 py-1.5 w-24" />
          <input name="longitude" aria-label="Longitude" placeholder="lng" className="rounded-lg border border-stone-300 dark:border-stone-600 px-2 py-1.5 w-24" />
          <input name="phone" aria-label="Phone" placeholder="phone" className="rounded-lg border border-stone-300 dark:border-stone-600 px-2 py-1.5 w-32" />
          <button disabled={busy} className="rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-3 py-1.5 disabled:opacity-50">Create</button>
        </form>
      )}
    </div>
  );
}
