"use client";

import { useState } from "react";

/** Native share where available, copy-link fallback. */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => {});
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <button
      onClick={share}
      className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-50"
      title="Share this store page"
    >
      {copied ? "Link copied ✓" : "Share"}
    </button>
  );
}
