"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/client/api";

interface CommentView {
  id: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  user: { id: string; displayName: string; reputation: number };
}

export function Comments({
  storeId,
  comments,
  currentUserId,
}: {
  storeId: string;
  comments: CommentView[];
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  async function saveEdit(commentId: string) {
    setBusy(true);
    const res = await fetch(`/api/comments/${commentId}/edit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: editText }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error ?? "Could not save the edit.");
      return;
    }
    setEditingId(null);
    setErr(null);
    router.refresh();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setErr(null);
    setNotice(null);
    const res = await apiFetch(`/api/stores/${storeId}/comments`, { body: { body } });
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setBody("");
    router.refresh();
  }

  async function act(commentId: string, action: "report" | "delete") {
    setErr(null);
    setNotice(null);
    const res = await apiFetch(`/api/comments/${commentId}/${action}`);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    if (action === "report") {
      setNotice(res.data.already ? "You already reported that note." : "Thanks — reported for review.");
    }
    router.refresh();
  }

  return (
    <div className="mt-8">
      <h2 className="font-medium text-stone-900 dark:text-stone-100">
        Store notes <span className="text-stone-400 font-normal">({comments.length})</span>
      </h2>
      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
        Flavor availability, store quirks — keep it relevant and civil.
      </p>

      {currentUserId ? (
        <form onSubmit={submit} className="mt-3 flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            placeholder="Add a note about this store…"
            aria-label="Add a note about this store"
            className="flex-1 rounded-lg border border-stone-300 dark:border-stone-600 px-3 py-2 text-sm"
          />
          <button
            disabled={busy || !body.trim()}
            className="rounded-lg bg-stone-900 text-white px-4 py-2 text-sm disabled:opacity-40 dark:bg-stone-100 dark:text-stone-900"
          >
            Post
          </button>
        </form>
      ) : (
        <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
          <Link href="/login" className="text-teal-700 underline dark:text-teal-400">Sign in</Link> to add a note.
        </p>
      )}
      {err && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{err}</p>}
      {notice && <p className="mt-2 text-sm text-teal-700 dark:text-teal-400">{notice}</p>}

      <ul className="mt-4 space-y-3">
        {comments.map((c) => (
          <li key={c.id} className="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-900">
            <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
              <span>
                <Link href={`/users/${c.user.id}`} className="font-medium text-stone-700 dark:text-stone-300 hover:underline">
                  {c.user.displayName}
                </Link>{" "}
                · rep {c.user.reputation} · {new Date(c.createdAt).toLocaleDateString()}
              </span>
              <span className="flex gap-2">
                {currentUserId === c.user.id ? (
                  <>
                    <button
                      onClick={() => {
                        setEditingId(c.id);
                        setEditText(c.body);
                      }}
                      className="hover:text-teal-700"
                    >
                      edit
                    </button>
                    <button onClick={() => act(c.id, "delete")} className="hover:text-red-600">
                      delete
                    </button>
                  </>
                ) : (
                  currentUserId && (
                    <button onClick={() => act(c.id, "report")} className="hover:text-amber-600">
                      report
                    </button>
                  )
                )}
              </span>
            </div>
            {editingId === c.id ? (
              <div className="mt-2 flex gap-2">
                <input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  maxLength={500}
                  className="flex-1 rounded-lg border border-stone-300 dark:border-stone-600 px-3 py-1.5 text-sm"
                  autoFocus
                />
                <button
                  onClick={() => saveEdit(c.id)}
                  disabled={busy || editText.trim().length < 2}
                  className="rounded-lg bg-stone-900 dark:bg-stone-100 dark:text-stone-900 px-3 py-1.5 text-sm text-white disabled:opacity-40"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="rounded-lg border border-stone-300 dark:border-stone-600 px-3 py-1.5 text-sm text-stone-600 dark:text-stone-400"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <p className="mt-1 text-sm text-stone-700 dark:text-stone-300 whitespace-pre-wrap">
                {c.body}
                {c.editedAt && (
                  <span
                    className="ml-1.5 text-[11px] text-stone-400"
                    title={`Edited ${new Date(c.editedAt).toLocaleString()}`}
                  >
                    (edited)
                  </span>
                )}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
