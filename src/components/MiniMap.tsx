"use client";

// Small single-store location map for store pages. Client-only (Leaflet
// touches `window`); loaded lazily with a skeleton.

import dynamic from "next/dynamic";

const Inner = dynamic(() => import("./MiniMapInner"), {
  ssr: false,
  loading: () => <div className="h-40 rounded-xl bg-stone-100 animate-pulse" />,
});

export function MiniMap({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  return (
    <div className="h-40">
      <Inner lat={lat} lng={lng} name={name} />
    </div>
  );
}
