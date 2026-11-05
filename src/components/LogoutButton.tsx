"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="text-stone-500 dark:text-stone-400 hover:text-stone-900 disabled:opacity-50"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } catch {
          // Offline: the server session persists but navigating home is
          // still the least-bad outcome; the cookie is sent again next time.
        } finally {
          setBusy(false);
        }
        router.push("/");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
