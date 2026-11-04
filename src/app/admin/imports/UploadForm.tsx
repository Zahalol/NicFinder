"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UploadForm() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setErr(null);
    let res: Response;
    try {
      res = await fetch("/api/admin/imports", { method: "POST", body: data });
    } catch {
      setBusy(false);
      setErr("Network error — try again.");
      return;
    }
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(json.error ?? "Upload failed.");
      return;
    }
    router.push(`/admin/imports/${json.batchId}`);
  }

  return (
    <form onSubmit={submit} className="mt-4 flex items-center gap-3 flex-wrap rounded-xl border border-dashed border-stone-300 bg-white p-4">
      <input
        type="file"
        name="file"
        accept=".csv,.xlsx"
        required
        className="text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-900 file:text-white file:px-3 file:py-1.5 file:text-sm"
      />
      <button
        disabled={busy}
        className="rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
      >
        {busy ? "Validating…" : "Upload & preview"}
      </button>
      {err && <span className="text-sm text-red-600">{err}</span>}
    </form>
  );
}
