"use client";

import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import type { StoreResult } from "@/lib/search";
import { formatCents } from "@/lib/money";

// Default marker icons break under bundlers; use a simple divIcon with the price.
// Fresh prices: solid teal chip. Stale prices: faded teal. Stores without a
// price: small neutral dot so they don't drown out the chips that matter.
function priceIcon(text: string, stale: boolean) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${stale ? "#5eead4" : "#0d9488"};color:${stale ? "#134e4a" : "white"};border-radius:8px;padding:2px 7px;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.3);transform:translate(-50%,-100%);${stale ? "opacity:.85;" : ""}">${text}</div>`,
    iconSize: [0, 0],
  });
}

function dotIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:10px;height:10px;background:#d6d3d1;border:1.5px solid #78716c;border-radius:50%;transform:translate(-50%,-50%);"></div>`,
    iconSize: [0, 0],
  });
}

export default function StoreMap({
  results,
  center,
  qty,
  productSlug = "zyn",
}: {
  results: StoreResult[];
  center: { lat: number; lng: number };
  qty: number;
  productSlug?: string;
}) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CircleMarker
        center={[center.lat, center.lng]}
        radius={7}
        pathOptions={{ color: "#1c1917", fillColor: "#1c1917", fillOpacity: 0.9 }}
      />
      {results
        .filter((r) => r.latitude !== null && r.longitude !== null)
        .map((r) => {
          const label = r.effective.perCanCents
            ? formatCents(r.effective.perCanCents)
            : r.latest
              ? formatCents(r.latest.priceCents)
              : null;
          return (
            <Marker
              key={r.id}
              position={[r.latitude!, r.longitude!]}
              icon={label ? priceIcon(label, r.latest?.freshness === "stale") : dotIcon()}
              zIndexOffset={label ? 1000 : 0}
            >
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <strong>{r.name}</strong>
                  {r.isDemo && (
                    <span style={{ color: "#b45309", fontSize: 10 }}> (demo data)</span>
                  )}
                  <br />
                  <span style={{ color: "#78716c", fontSize: 12 }}>
                    {r.address} · {r.distanceMiles} mi
                  </span>
                  <br />
                  {r.latest ? (
                    <span>
                      {formatCents(r.latest.priceCents)} per can
                      {qty > 1 && r.effective.perCanCents
                        ? ` · ${formatCents(r.effective.perCanCents)}/can ×${qty}`
                        : ""}
                    </span>
                  ) : (
                    <span style={{ color: "#a8a29e" }}>No price reported yet</span>
                  )}
                  <br />
                  <Link href={`/stores/${r.id}?product=${productSlug}`}>Details →</Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
    </MapContainer>
  );
}
