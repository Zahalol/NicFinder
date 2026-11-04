"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client/api";
import { CANONICAL_FIELDS } from "@/lib/import/contract";

export function MappingEditor({
  batchId,
  mapping,
}: {
  batchId: string;
  mapping: Record<string, string | null>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(mapping);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const unmapped = Object.entries(mapping).filter(([, v]) => v === null);

  async function save() {
    setBusy(true);
    setErr(null);
    const res = await apiFetch(`/api/admin/imports/${batchId}/remap`, {
      body: { mapping: local },
    });
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
      if (res.status === 409) router.refresh(); // batch no longer in preview
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="mt-4 rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-stone-900">
          Column mapping
          {unmapped.length > 0 && (
            <span className="ml-2 text-xs text-amber-600">
              {unmapped.length} unmapped column{unmapped.length > 1 ? "s" : ""}
            </span>
          )}
        </h3>
        <button onClick={() => setOpen(!open)} className="text-sm text-teal-700 hover:underline">
          {open ? "Hide" : "Edit mapping"}
        </button>
      </div>
      {!open ? (
        <p className="mt-1 text-xs text-stone-500 truncate">
          {Object.entries(mapping)
            .filter(([, v]) => v)
            .map(([h, f]) => `${h}→${f}`)
            .join(", ")}
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {Object.entries(local).map(([header, field]) => (
            <div key={header} className="flex items-center gap-2 text-sm">
              <span className="w-48 truncate font-mono text-stone-600">{header}</span>
              <select
                aria-label={`Map column ${header}`}
                value={field ?? ""}
                onChange={(e) =>
                  setLocal({ ...local, [header]: e.target.value || null })
                }
                className="rounded-lg border border-stone-300 px-2 py-1 bg-white"
              >
                <option value="">— ignore —</option>
                {CANONICAL_FIELDS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
          ))}
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button
            onClick={save}
            disabled={busy}
            className="rounded-lg bg-stone-900 text-white px-4 py-1.5 text-sm disabled:opacity-50"
          >
            {busy ? "Revalidating…" : "Apply & revalidate"}
          </button>
        </div>
      )}
    </div>
  );
}
