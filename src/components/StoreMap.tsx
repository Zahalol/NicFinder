"use client";

import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import type { StoreResult } from "@/lib/search";
import { formatCents } from "@/lib/money";

// Default marker icons break under bundlers; use a simple divIcon with the price.
function priceIcon(text: string, muted: boolean) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${muted ? "#a8a29e" : "#0d9488"};color:white;border-radius:8px;padding:2px 7px;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,.3);transform:translate(-50%,-100%);">${text}</div>`,
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
              : "?";
          return (
            <Marker
              key={r.id}
              position={[r.latitude!, r.longitude!]}
              icon={priceIcon(label, !r.latest)}
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
