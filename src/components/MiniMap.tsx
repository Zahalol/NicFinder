"use client";

// Small single-store location map for store pages. Client-only (Leaflet
// touches `window`); loaded lazily with a skeleton.

import dynamic from "next/dynamic";

const Inner = dynamic(() => import("./MiniMapInner"), {
  ssr: false,
  loading: () => <div className="h-40 rounded-xl bg-stone-100 dark:bg-stone-800 animate-pulse" />,
});

export function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="h-40">
      <Inner lat={lat} lng={lng} />
    </div>
  );
}
