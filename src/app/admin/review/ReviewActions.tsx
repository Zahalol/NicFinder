"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReviewActions({
  contributionId,
  commentId,
  commentStatus,
  flagId,
  dealFlagId,
}: {
  contributionId?: string;
  commentId?: string;
  commentStatus?: string;
  flagId?: string;
  dealFlagId?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function act(
    action: string,
    targetId: string,
    needReason = false,
    extra: Record<string, string> = {}
  ) {
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
      body: JSON.stringify({ action, targetId, reason, ...extra }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(json.error ?? "Failed."); return; }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {err && <span className="text-xs text-red-600 dark:text-red-400">{err}</span>}
      {contributionId && (
        <>
          <button
            disabled={busy}
            onClick={() => act("APPROVE_CONTRIBUTION", contributionId)}
            className="rounded border border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-400 px-2 py-1 text-xs hover:bg-teal-50 dark:hover:bg-teal-950"
          >
            Approve & publish
          </button>
          <button
            disabled={busy}
            onClick={() => act("REJECT_CONTRIBUTION", contributionId, true)}
            className="rounded border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 px-2 py-1 text-xs hover:bg-red-50 dark:hover:bg-red-950"
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
            className="rounded border border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-400 px-2 py-1 text-xs hover:bg-teal-50 dark:hover:bg-teal-950"
          >
            Uphold — invalidate observation
          </button>
          <button
            disabled={busy}
            onClick={() => act("DISMISS_FLAG", flagId, true)}
            className="rounded border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 px-2 py-1 text-xs hover:bg-red-50 dark:hover:bg-red-950"
          >
            Dismiss
          </button>
        </>
      )}
      {dealFlagId && (
        <>
          <button
            disabled={busy}
            onClick={() => act("UPHOLD_DEAL_FLAG", dealFlagId, false, { how: "ended" })}
            className="rounded border border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-400 px-2 py-1 text-xs hover:bg-teal-50 dark:hover:bg-teal-950"
          >
            Deal ended
          </button>
          <button
            disabled={busy}
            onClick={() => act("UPHOLD_DEAL_FLAG", dealFlagId, false, { how: "invalid" })}
            className="rounded border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 px-2 py-1 text-xs hover:bg-amber-50 dark:hover:bg-amber-950"
          >
            Invalid data
          </button>
          <button
            disabled={busy}
            onClick={() => act("DISMISS_DEAL_FLAG", dealFlagId, true)}
            className="rounded border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 px-2 py-1 text-xs hover:bg-red-50 dark:hover:bg-red-950"
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
              className="rounded border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 px-2 py-1 text-xs hover:bg-red-50 dark:hover:bg-red-950"
            >
              Hide
            </button>
          ) : (
            <button
              disabled={busy}
              onClick={() => act("RESTORE_COMMENT", commentId)}
              className="rounded border border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-400 px-2 py-1 text-xs hover:bg-teal-50 dark:hover:bg-teal-950"
            >
              Restore
            </button>
          )}
        </>
      )}
    </div>
  );
}
