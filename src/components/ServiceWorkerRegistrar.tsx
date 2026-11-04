"use client";

// EXPERIMENT (Cycle 23): registers the minimal offline service worker.
// Remove this file + its call in layout.tsx + public/sw.js to drop it.

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Dev servers rebuild constantly; only register on production builds.
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // registration is a progressive enhancement only
    });
  }, []);
  return null;
}
