"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/client/api";

interface StoreLite {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
}

export function DuplicateList({
  duplicates,
}: {
  duplicates: { id: string; reason: string; a: StoreLite; b: StoreLite }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function act(id: string, action: "merge" | "dismiss", keepId?: string) {
    if (busy) return; // one resolution in flight at a time
    setBusy(id);
    setErr(null);
    const res = await apiFetch(`/api/admin/duplicates/${id}`, { body: { action, keepId } });
    setBusy(null);
    // Surface failures: a 409 here means the candidate or a store was already
    // resolved/merged elsewhere — silently refreshing made every click look
    // like a no-op.
    if (!res.ok) setErr(res.error);
    router.refresh();
  }

  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
      <h2 className="text-sm font-medium text-amber-900">
        Possible duplicate stores ({duplicates.length})
      </h2>
      {err && <p className="mt-1 text-sm text-red-600">{err}</p>}
      <ul className="mt-2 space-y-3">
        {duplicates.map((d) => (
          <li key={d.id} className="rounded-lg bg-white border border-stone-200 p-3 text-sm">
            <p className="text-xs text-stone-500">{d.reason}</p>
            <div className="mt-1 grid sm:grid-cols-2 gap-2">
              {[d.a, d.b].map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2">
                  <span>
                    <strong>{s.name}</strong>{" "}
                    <span className="text-stone-500">{s.address} · {s.phone ?? "no phone"}</span>
                  </span>
                  <button
                    disabled={busy === d.id}
                    onClick={() => act(d.id, "merge", s.id)}
                    className="shrink-0 rounded border border-teal-300 text-teal-700 px-2 py-0.5 text-xs hover:bg-teal-50"
                  >
                    Keep this
                  </button>
                </div>
              ))}
            </div>
            <button
              disabled={busy === d.id}
              onClick={() => act(d.id, "dismiss")}
              className="mt-2 text-xs text-stone-500 hover:text-stone-900 underline"
            >
              Not duplicates — dismiss
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
