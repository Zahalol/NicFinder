"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReviewActions({
  contributionId,
  commentId,
  commentStatus,
  flagId,
}: {
  contributionId?: string;
  commentId?: string;
  commentStatus?: string;
  flagId?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function act(action: string, targetId: string, needReason = false) {
    let reason = "";
    if (needReason) {
      reason = window.prompt("Reason:") ?? "";
      if (!reason) return;
    }
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/admin/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, targetId, reason }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(json.error ?? "Failed."); return; }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {err && <span className="text-xs text-red-600">{err}</span>}
      {contributionId && (
        <>
          <button
            disabled={busy}
            onClick={() => act("APPROVE_CONTRIBUTION", contributionId)}
            className="rounded border border-teal-300 text-teal-700 px-2 py-1 text-xs hover:bg-teal-50"
          >
            Approve & publish
          </button>
          <button
            disabled={busy}
            onClick={() => act("REJECT_CONTRIBUTION", contributionId, true)}
            className="rounded border border-red-300 text-red-700 px-2 py-1 text-xs hover:bg-red-50"
          >
            Reject
          </button>
        </>
      )}
      {flagId && (
        <>
          <button
            disabled={busy}
            onClick={() => act("UPHOLD_FLAG", flagId)}
            className="rounded border border-teal-300 text-teal-700 px-2 py-1 text-xs hover:bg-teal-50"
          >
            Uphold — invalidate observation
          </button>
          <button
            disabled={busy}
            onClick={() => act("DISMISS_FLAG", flagId, true)}
            className="rounded border border-red-300 text-red-700 px-2 py-1 text-xs hover:bg-red-50"
          >
            Dismiss
          </button>
        </>
      )}
      {commentId && (
        <>
          {commentStatus === "VISIBLE" ? (
            <button
              disabled={busy}
              onClick={() => act("HIDE_COMMENT", commentId)}
              className="rounded border border-red-300 text-red-700 px-2 py-1 text-xs hover:bg-red-50"
            >
              Hide
            </button>
          ) : (
            <button
              disabled={busy}
              onClick={() => act("RESTORE_COMMENT", commentId)}
              className="rounded border border-teal-300 text-teal-700 px-2 py-1 text-xs hover:bg-teal-50"
            >
              Restore
            </button>
          )}
        </>
      )}
    </div>
  );
}
