"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DuplicateScanButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function scan() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/duplicates", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg(json.error ?? "Scan failed.");
      return;
    }
    setMsg(
      json.candidatesCreated > 0
        ? `Found ${json.candidatesCreated} new possible duplicate${json.candidatesCreated === 1 ? "" : "s"} (scanned ${json.scannedStores} stores).`
        : `No new duplicates found (scanned ${json.scannedStores} stores).`
    );
    router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={scan}
        disabled={busy}
        className="rounded-lg border border-stone-300 dark:border-stone-600 px-3 py-1.5 text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-50"
      >
        {busy ? "Scanning…" : "Scan for duplicates"}
      </button>
      {msg && <span className="text-xs text-stone-500 dark:text-stone-400">{msg}</span>}
    </span>
  );
}
