"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BatchActions({
  batchId,
  status,
}: {
  batchId: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function commit() {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/admin/imports/${batchId}/commit`, { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(json.error ?? "Commit failed."); return; }
    router.refresh();
  }

  async function reverse() {
    const reason = window.prompt(
      "Reversing invalidates this batch's observations (history is kept). Reason:"
    );
    if (!reason) return;
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/admin/imports/${batchId}/reverse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(json.error ?? "Reverse failed."); return; }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {err && <span className="text-sm text-red-600">{err}</span>}
      <a
        href={`/api/admin/imports/${batchId}/errors`}
        className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50"
      >
        Error report (CSV)
      </a>
      {status === "PREVIEW" && (
        <button
          onClick={commit}
          disabled={busy}
          className="rounded-lg bg-teal-600 text-white px-4 py-1.5 text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
        >
          {busy ? "Committing…" : "Commit import"}
        </button>
      )}
      {status === "COMMITTED" && (
        <button
          onClick={reverse}
          disabled={busy}
          className="rounded-lg border border-red-300 text-red-700 px-4 py-1.5 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
        >
          Reverse import
        </button>
      )}
    </div>
  );
}
