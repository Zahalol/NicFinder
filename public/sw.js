// NicFinder service worker — deliberately minimal and honest:
//   * Navigations are ALWAYS network-first; pages and price data are never
//     served from cache while online, so no one ever sees a silently stale
//     price. Offline, navigations fall back to the /offline page.
//   * Only the tiny static shell (offline page + icons + manifest) is
//     precached. Bump VERSION to invalidate.
const VERSION = "nf-sw-v1";
const SHELL = [
  "/offline",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch map tiles etc.

  // App icons: cache-first (immutable, versioned by SW VERSION).
  if (url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then((hit) => hit ?? fetch(req))
    );
    return;
  }

  // Page navigations: network-first, offline fallback only.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match("/offline").then((hit) => hit ?? Response.error())
      )
    );
  }
});
