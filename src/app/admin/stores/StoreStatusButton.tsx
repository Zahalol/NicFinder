"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StoreStatusButton({
  storeId,
  mode,
}: {
  storeId: string;
  mode: "retire" | "restore";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act() {
    let reason = "";
    if (mode === "retire") {
      reason = window.prompt("Why retire this store? (e.g. closed permanently)") ?? "";
      if (!reason) return;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/stores/${storeId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: mode, reason }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      window.alert(json.error ?? "Failed.");
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={act}
      disabled={busy}
      className={`rounded border px-1.5 py-0.5 text-[11px] disabled:opacity-50 ${
        mode === "retire"
          ? "border-stone-200 text-stone-400 hover:border-red-300 hover:text-red-600"
          : "border-teal-300 text-teal-700 hover:bg-teal-50"
      }`}
      title={
        mode === "retire"
          ? "Remove from search (history preserved; restorable)"
          : "Bring this store back"
      }
    >
      {mode === "retire" ? "retire" : "restore"}
    </button>
  );
}
