"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

  async function post(url: string, body: Record<string, unknown>) {
    setErr(null);
    setMsg(null);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(json.error ?? "Failed."); return false; }
    setMsg("Saved.");
    router.refresh();
    return true;
  }

  return (
    <div className="mt-4 rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex gap-2 text-sm">
        <button
          onClick={() => setOpen(open === "price" ? "none" : "price")}
          className="rounded-lg border border-stone-300 px-3 py-1.5 hover:bg-stone-50"
        >
          + Manual price entry
        </button>
        <button
          onClick={() => setOpen(open === "store" ? "none" : "store")}
          className="rounded-lg border border-stone-300 px-3 py-1.5 hover:bg-stone-50"
        >
          + New store
        </button>
        {msg && <span className="text-teal-700 self-center">{msg}</span>}
        {err && <span className="text-red-600 self-center">{err}</span>}
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
          <select name="storeId" required className="rounded-lg border border-stone-300 px-2 py-1.5 max-w-60 bg-white">
            <option value="">Store…</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name} — {s.address}</option>
            ))}
          </select>
          <select name="productLineId" required className="rounded-lg border border-stone-300 px-2 py-1.5 bg-white">
            {productLines.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <input name="price" required placeholder="6.49" inputMode="decimal" className="w-20 rounded-lg border border-stone-300 px-2 py-1.5" />
          <select name="availability" className="rounded-lg border border-stone-300 px-2 py-1.5 bg-white">
            <option value="IN_STOCK">in stock</option>
            <option value="OUT_OF_STOCK">out of stock</option>
            <option value="NOT_CARRIED">not carried</option>
            <option value="UNKNOWN">unknown</option>
          </select>
          <input name="notes" placeholder="note (optional)" className="rounded-lg border border-stone-300 px-2 py-1.5 w-48" />
          <button className="rounded-lg bg-stone-900 text-white px-3 py-1.5">Save</button>
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
          <input name="name" required placeholder="Name" className="rounded-lg border border-stone-300 px-2 py-1.5" />
          <input name="address" placeholder="Street address" className="rounded-lg border border-stone-300 px-2 py-1.5 w-56" />
          <input name="city" placeholder="City" className="rounded-lg border border-stone-300 px-2 py-1.5 w-28" />
          <input name="state" placeholder="IL" maxLength={2} className="rounded-lg border border-stone-300 px-2 py-1.5 w-12" />
          <input name="zip" placeholder="ZIP" className="rounded-lg border border-stone-300 px-2 py-1.5 w-20" />
          <input name="latitude" placeholder="lat" className="rounded-lg border border-stone-300 px-2 py-1.5 w-24" />
          <input name="longitude" placeholder="lng" className="rounded-lg border border-stone-300 px-2 py-1.5 w-24" />
          <input name="phone" placeholder="phone" className="rounded-lg border border-stone-300 px-2 py-1.5 w-32" />
          <button className="rounded-lg bg-stone-900 text-white px-3 py-1.5">Create</button>
        </form>
      )}
    </div>
  );
}
