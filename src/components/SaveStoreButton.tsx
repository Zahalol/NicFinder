"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/client/api";

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
  const [err, setErr] = useState<string | null>(null);

  async function toggle() {
    if (!signedIn) {
      router.push("/login");
      return;
    }
    setBusy(true);
    setErr(null);
    const res = await apiFetch(`/api/stores/${storeId}/save`, {
      method: saved ? "DELETE" : "POST",
    });
    setBusy(false);
    if (res.ok) {
      setSaved(!saved);
    } else if (res.status === 401) {
      router.push("/login"); // session expired since the page rendered
    } else {
      setErr(res.error);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={saved ? "Remove from your watchlist" : "Save to your watchlist"}
      aria-pressed={saved}
      className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
        saved
          ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 hover:bg-amber-100"
          : "border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800"
      } disabled:opacity-50`}
    >
      {saved ? "★ Saved" : "☆ Save"}
      {err && (
        <span role="alert" className="ml-2 text-xs font-normal text-red-600">
          {err}
        </span>
      )}
    </button>
  );
}
