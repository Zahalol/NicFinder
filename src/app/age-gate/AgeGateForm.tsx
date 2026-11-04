"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AgeGateForm({ next }: { next: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  // Only allow internal redirects
  const target = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/age", { method: "POST" });
        router.push(target);
        router.refresh();
      }}
      className="mt-6 w-full rounded-xl bg-stone-900 text-white py-3 font-medium hover:bg-stone-700 disabled:opacity-50"
    >
      I am 21 or older — enter
    </button>
  );
}
