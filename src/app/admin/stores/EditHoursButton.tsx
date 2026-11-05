"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EditHoursButton({
  storeId,
  hours,
}: {
  storeId: string;
  hours: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function edit() {
    const next = window.prompt(
      "Opening hours (free text, e.g. “Mon–Sat 6am–11pm, Sun 8am–9pm”; empty clears):",
      hours ?? ""
    );
    if (next === null) return;
    setBusy(true);
    const res = await fetch(`/api/admin/stores/${storeId}/details`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hours: next }),
    });
    setBusy(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      window.alert(json.error ?? "Failed.");
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={edit}
      disabled={busy}
      className="rounded border border-stone-200 px-1.5 py-0.5 text-[11px] text-stone-400 hover:border-stone-300 hover:text-stone-600 disabled:opacity-50"
      title={hours ? `Hours: ${hours}` : "Set opening hours"}
    >
      {hours ? "hours ✓" : "hours"}
    </button>
  );
}
