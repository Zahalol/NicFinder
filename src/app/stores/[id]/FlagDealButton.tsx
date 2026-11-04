"use client";

import { useState } from "react";

/** "This deal ended / is wrong" — flags one deal for moderator review. */
export function FlagDealButton({
  storeId,
  dealId,
  signedIn,
}: {
  storeId: string;
  dealId: string;
  signedIn: boolean;
}) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");

  if (!signedIn) return null;
  if (state === "done")
    return <span className="text-[11px] text-teal-700">Sent for review</span>;

  async function flag() {
    const reason = window.prompt(
      "What’s wrong with this deal? (e.g. “no longer offered”, “terms are different now”)"
    );
    if (!reason) return;
    setState("busy");
    const res = await fetch(`/api/stores/${storeId}/contributions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "FLAG_DEAL", dealId, comment: reason }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      setState("done");
    } else {
      setState("idle");
      window.alert(json.error ?? "Could not flag this deal.");
    }
  }

  return (
    <button
      onClick={flag}
      disabled={state === "busy"}
      className="text-[11px] text-stone-400 underline decoration-dotted hover:text-red-600 disabled:opacity-50"
      title="Report that this deal has ended or is wrong"
    >
      report issue
    </button>
  );
}
