"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SettingsPanel({
  displayName,
  hasPassword,
  sessionCount,
}: {
  displayName: string;
  hasPassword: boolean;
  sessionCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(displayName);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function post(url: string, body: unknown): Promise<boolean> {
    setBusy(true);
    setErr(null);
    setMsg(null);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(json.error ?? "Something went wrong.");
      return false;
    }
    setMsg(json.message ?? "Saved.");
    return true;
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (await post("/api/account/profile", { displayName: name })) router.refresh();
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (
      await post("/api/account/password", {
        currentPassword: currentPw,
        newPassword: newPw,
      })
    ) {
      setCurrentPw("");
      setNewPw("");
    }
  }

  async function logoutAll() {
    if (!window.confirm("Sign out of every device, including this one?")) return;
    await fetch("/api/account/logout-all", { method: "POST" }).catch(() => {});
    window.location.href = "/";
  }

  const input = "w-full rounded-lg border border-stone-300 dark:border-stone-600 px-3 py-2 text-sm";

  return (
    <section className="mt-8">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="font-medium text-stone-900 dark:text-stone-100 hover:text-teal-700"
      >
        Account settings {open ? "▾" : "▸"}
      </button>
      {open && (
        <div className="mt-3 space-y-5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-4 max-w-md">
          {(msg || err) && (
            <p className={`text-sm ${err ? "text-red-600 dark:text-red-400" : "text-teal-700 dark:text-teal-400"}`}>{err ?? msg}</p>
          )}

          <form onSubmit={saveName} className="space-y-2">
            <label className="text-sm font-medium text-stone-700 dark:text-stone-300" htmlFor="set-name">
              Display name
            </label>
            <div className="flex gap-2">
              <input
                id="set-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                maxLength={40}
                className={input}
              />
              <button
                disabled={busy || name.trim().length < 2 || name === displayName}
                className="rounded-lg bg-stone-900 dark:bg-stone-100 dark:text-stone-900 px-3 py-2 text-sm text-white disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </form>

          <form onSubmit={savePassword} className="space-y-2">
            <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
              {hasPassword ? "Change password" : "Set a password"}
            </p>
            {hasPassword && (
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="Current password"
                autoComplete="current-password"
                className={input}
              />
            )}
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="New password (10+ characters)"
              minLength={10}
              autoComplete="new-password"
              className={input}
            />
            <button
              disabled={busy || newPw.length < 10 || (hasPassword && !currentPw)}
              className="rounded-lg bg-stone-900 dark:bg-stone-100 dark:text-stone-900 px-3 py-2 text-sm text-white disabled:opacity-40"
            >
              {hasPassword ? "Change password" : "Set password"}
            </button>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Changing your password signs out your other devices.
            </p>
          </form>

          <div className="border-t border-stone-100 dark:border-stone-800 pt-4">
            <button
              onClick={logoutAll}
              disabled={busy}
              className="rounded-lg border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950"
            >
              Sign out everywhere
            </button>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Ends all {sessionCount} active session{sessionCount === 1 ? "" : "s"}, including this one.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
