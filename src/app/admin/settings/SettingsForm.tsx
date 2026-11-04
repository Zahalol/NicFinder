"use client";

import { useState } from "react";
import type { AppSettings } from "@/lib/settings";

export function SettingsForm({
  settings,
  docs,
  readOnly,
}: {
  settings: AppSettings;
  docs: Record<string, string>;
  readOnly: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(settings).map(([k, v]) => [k, String(v)]))
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(json.error ?? "Save failed."); return; }
    setMsg("Settings saved.");
  }

  return (
    <form onSubmit={save} className="mt-4 space-y-3">
      {Object.keys(settings).map((key) => (
        <div key={key} className="flex items-center gap-3">
          <label className="w-64 text-sm font-mono text-stone-700">{key}</label>
          <input
            value={values[key]}
            onChange={(e) => setValues({ ...values, [key]: e.target.value })}
            disabled={readOnly}
            inputMode="decimal"
            className="w-24 rounded-lg border border-stone-300 px-2 py-1 text-sm disabled:bg-stone-100"
          />
          <span className="text-xs text-stone-500 flex-1">{docs[key]}</span>
        </div>
      ))}
      {!readOnly && (
        <div className="flex items-center gap-3 pt-2">
          <button
            disabled={busy}
            className="rounded-lg bg-stone-900 text-white px-4 py-2 text-sm disabled:opacity-50"
          >
            Save settings
          </button>
          {msg && <span className="text-sm text-teal-700">{msg}</span>}
          {err && <span className="text-sm text-red-600">{err}</span>}
        </div>
      )}
    </form>
  );
}
