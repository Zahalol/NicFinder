"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function AuthForm({
  mode,
  googleEnabled,
  replitEnabled = false,
  initialError = null,
}: {
  mode: "login" | "signup";
  googleEnabled: boolean;
  replitEnabled?: boolean;
  initialError?: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [err, setErr] = useState<string | null>(initialError);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/auth/${mode === "login" ? "login" : "signup"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        mode === "login" ? { email, password } : { email, password, displayName }
      ),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error ?? "Something went wrong.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="py-16 max-w-sm mx-auto">
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100 text-center">
        {mode === "login" ? "Sign in" : "Create an account"}
      </h1>
      <p className="mt-2 text-sm text-stone-500 dark:text-stone-400 text-center">
        Accounts are for confirming and correcting prices — browsing is always free.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-3">
        {mode === "signup" && (
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display name"
            required
            minLength={2}
            maxLength={40}
            className="w-full rounded-lg border border-stone-300 dark:border-stone-600 px-3 py-2.5"
          />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="w-full rounded-lg border border-stone-300 dark:border-stone-600 px-3 py-2.5"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "signup" ? "Password (10+ characters)" : "Password"}
          required
          minLength={mode === "signup" ? 10 : 1}
          className="w-full rounded-lg border border-stone-300 dark:border-stone-600 px-3 py-2.5"
        />
        {err && <p className="text-sm text-red-600 dark:text-red-400">{err}</p>}
        <button
          disabled={busy}
          className="w-full rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 py-2.5 font-medium hover:bg-stone-700 dark:hover:bg-stone-300 disabled:opacity-50"
        >
          {mode === "login" ? "Sign in" : "Sign up"}
        </button>
      </form>

      {googleEnabled ? (
        <a
          href="/api/auth/google"
          className="mt-3 block w-full rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 py-2.5 text-center font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
        >
          Continue with Google
        </a>
      ) : !replitEnabled ? (
        <p className="mt-3 text-xs text-stone-400 text-center">
          Google sign-in is not configured in this environment (see .env.example).
        </p>
      ) : null}
      {replitEnabled && (
        <a
          href="/api/auth/replit"
          className="mt-3 block w-full rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 py-2.5 text-center font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800"
        >
          Continue with Replit (Google / GitHub / Apple / email)
        </a>
      )}

      <p className="mt-6 text-sm text-stone-500 dark:text-stone-400 text-center">
        {mode === "login" ? (
          <>No account? <Link href="/signup" className="text-teal-700 dark:text-teal-400 underline">Sign up</Link></>
        ) : (
          <>Have an account? <Link href="/login" className="text-teal-700 dark:text-teal-400 underline">Sign in</Link></>
        )}
      </p>
    </div>
  );
}
