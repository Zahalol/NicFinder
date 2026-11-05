import type { MetadataRoute } from "next";

// Installable-app manifest. Deliberately no service worker: stale cached
// prices would violate the freshness promise, and the app is useless
// offline anyway (all data is live).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NicFinder — nicotine pouch price comparison",
    short_name: "NicFinder",
    description:
      "Compare reported ZYN nicotine pouch prices near you. Informational service for adults 21+.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#0d9488",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
