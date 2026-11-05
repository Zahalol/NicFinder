"use client";

// Share the current store page via the native share sheet when available,
// else copy the link.

import { useState } from "react";

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.origin + window.location.pathname;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // user cancelled or share failed — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — nothing sensible left to do
    }
  }

  return (
    <button
      onClick={share}
      className="rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 px-2.5 py-1 text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800"
      aria-label={`Share ${title}`}
    >
      {copied ? "Link copied ✓" : "Share"}
    </button>
  );
}
