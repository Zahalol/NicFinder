"use client";

import { useState } from "react";

/**
 * "Report issue" on a single price-history row — flags that specific
 * observation (current or historical) for moderator review.
 */
export function FlagObservationButton({
  storeId,
  observationId,
  signedIn,
}: {
  storeId: string;
  observationId: string;
  signedIn: boolean;
}) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  if (!signedIn) return null;
  if (state === "done")
    return <span className="text-[11px] text-teal-700">{msg ?? "Flagged"}</span>;

  async function flag() {
    const reason = window.prompt(
      "What’s wrong with this observation? (e.g. “price was mistyped”, “store never had this price”)"
    );
    if (!reason) return;
    setState("busy");
    const res = await fetch(`/api/stores/${storeId}/contributions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "FLAG_OBSERVATION",
        targetObservationId: observationId,
        comment: reason,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg("Sent for review");
      setState("done");
    } else {
      setMsg(null);
      setState("idle");
      window.alert(json.error ?? "Could not flag this observation.");
    }
  }

  return (
    <button
      onClick={flag}
      disabled={state === "busy"}
      className="text-[11px] text-stone-400 underline decoration-dotted hover:text-red-600 disabled:opacity-50"
      title="Report a problem with this specific observation"
    >
      report issue
    </button>
  );
}
