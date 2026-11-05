import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NicFinder — nicotine pouch price comparison",
    short_name: "NicFinder",
    description:
      "Compare reported ZYN nicotine pouch prices at stores near you. Informational service for adults 21+.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#0d9488",
    categories: ["shopping", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
