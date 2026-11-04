"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  url: string | null;
  read: boolean;
  createdAt: string;
}

export function NotificationsPanel({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const unread = items.filter((n) => !n.read).length;

  async function markRead() {
    setBusy(true);
    await fetch("/api/notifications/read", { method: "POST" }).catch(() => {});
    setBusy(false);
    router.refresh();
  }

  return (
    <section id="notifications" className="mt-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium text-stone-900">
          Price alerts{unread > 0 && <span className="ml-1.5 text-sm text-teal-700">({unread} new)</span>}
        </h2>
        {unread > 0 && (
          <button
            onClick={markRead}
            disabled={busy}
            className="rounded border border-stone-300 px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-50 disabled:opacity-50"
          >
            Mark all read
          </button>
        )}
      </div>
      <p className="mt-0.5 text-xs text-stone-500">
        In-app alerts when a price changes at a store you saved. Nothing is
        emailed or sent anywhere.
      </p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-stone-400">
          No alerts yet — save a store (☆ on its page) to watch its prices.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((n) => (
            <li
              key={n.id}
              className={`rounded-lg border p-3 text-sm ${
                n.read ? "border-stone-200 bg-white" : "border-teal-200 bg-teal-50/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  {n.url ? (
                    <Link href={n.url} className="font-medium text-stone-900 hover:underline">
                      {n.title}
                    </Link>
                  ) : (
                    <span className="font-medium text-stone-900">{n.title}</span>
                  )}
                  {n.body && <p className="text-xs text-stone-500 mt-0.5">{n.body}</p>}
                </div>
                <span className="shrink-0 text-xs text-stone-400">
                  {new Date(n.createdAt).toLocaleDateString()}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
