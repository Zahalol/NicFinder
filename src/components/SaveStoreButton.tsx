"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SaveStoreButton({
  storeId,
  initialSaved,
  signedIn,
}: {
  storeId: string;
  initialSaved: boolean;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!signedIn) {
      router.push("/login");
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/stores/${storeId}/save`, {
      method: saved ? "DELETE" : "POST",
    });
    setBusy(false);
    if (res.ok) setSaved(!saved);
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={saved ? "Remove from your watchlist" : "Save to your watchlist"}
      aria-pressed={saved}
      className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
        saved
          ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
          : "border-stone-300 bg-white text-stone-600 hover:bg-stone-50"
      } disabled:opacity-50`}
    >
      {saved ? "★ Saved" : "☆ Save"}
    </button>
  );
}
