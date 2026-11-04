"use client";

import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function MiniMapInner({
  lat,
  lng,
}: {
  lat: number;
  lng: number;
  name?: string;
}) {
  const icon = L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;background:#0d9488;border:3px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.4);transform:translate(-50%,-50%);"></div>`,
    iconSize: [0, 0],
  });
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      style={{ height: "100%", width: "100%" }}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      zoomControl={false}
      keyboard={false}
      attributionControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} icon={icon} interactive={false} />
    </MapContainer>
  );
}
