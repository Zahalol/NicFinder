"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/client/api";

interface CommentView {
  id: string;
  body: string;
  createdAt: string;
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
      <h2 className="font-medium text-stone-900">
        Store notes <span className="text-stone-400 font-normal">({comments.length})</span>
      </h2>
      <p className="text-xs text-stone-500 mt-0.5">
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
            className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <button
            disabled={busy || !body.trim()}
            className="rounded-lg bg-stone-900 text-white px-4 py-2 text-sm disabled:opacity-40"
          >
            Post
          </button>
        </form>
      ) : (
        <p className="mt-3 text-sm text-stone-500">
          <Link href="/login" className="text-teal-700 underline">Sign in</Link> to add a note.
        </p>
      )}
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      {notice && <p className="mt-2 text-sm text-teal-700">{notice}</p>}

      <ul className="mt-4 space-y-3">
        {comments.map((c) => (
          <li key={c.id} className="rounded-lg border border-stone-200 bg-white p-3">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>
                <Link href={`/users/${c.user.id}`} className="font-medium text-stone-700 hover:underline">
                  {c.user.displayName}
                </Link>{" "}
                · rep {c.user.reputation} · {new Date(c.createdAt).toLocaleDateString()}
              </span>
              <span className="flex gap-2">
                {currentUserId === c.user.id ? (
                  <button onClick={() => act(c.id, "delete")} className="hover:text-red-600">
                    delete
                  </button>
                ) : (
                  currentUserId && (
                    <button onClick={() => act(c.id, "report")} className="hover:text-amber-600">
                      report
                    </button>
                  )
                )}
              </span>
            </div>
            <p className="mt-1 text-sm text-stone-700 whitespace-pre-wrap">{c.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
