"use client";

import { useState } from "react";
import type { AppSettings } from "@/lib/settings";
import { apiFetch } from "@/lib/client/api";

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
    const res = await apiFetch("/api/admin/settings", { body: values });
    setBusy(false);
    if (!res.ok) { setErr(res.error); return; }
    setMsg("Settings saved.");
  }

  return (
    <form onSubmit={save} className="mt-4 space-y-3">
      {Object.keys(settings).map((key) => (
        <div key={key} className="flex items-center gap-3">
          <label htmlFor={`setting-${key}`} className="w-64 text-sm font-mono text-stone-700 dark:text-stone-300">{key}</label>
          <input
            id={`setting-${key}`}
            value={values[key]}
            onChange={(e) => setValues({ ...values, [key]: e.target.value })}
            disabled={readOnly}
            inputMode="decimal"
            className="w-24 rounded-lg border border-stone-300 dark:border-stone-600 px-2 py-1 text-sm disabled:bg-stone-100"
          />
          <span className="text-xs text-stone-500 dark:text-stone-400 flex-1">{docs[key]}</span>
        </div>
      ))}
      {!readOnly && (
        <div className="flex items-center gap-3 pt-2">
          <button
            disabled={busy}
            className="rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-4 py-2 text-sm disabled:opacity-50"
          >
            Save settings
          </button>
          {msg && <span className="text-sm text-teal-700 dark:text-teal-400">{msg}</span>}
          {err && <span className="text-sm text-red-600 dark:text-red-400">{err}</span>}
        </div>
      )}
    </form>
  );
}
