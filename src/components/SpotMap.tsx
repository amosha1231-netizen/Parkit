"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useRouter } from "next/navigation";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { shekels } from "@/lib/pricing";
import type { SpotWithAvailability } from "@/lib/types";

const TEL_AVIV: [number, number] = [32.077, 34.78];

function priceIcon(agorot: number) {
  return L.divIcon({ className: "", html: `<div class="pin">${shekels(agorot)}</div>`, iconSize: [44, 22], iconAnchor: [22, 11] });
}

export default function SpotMap({ spots }: { spots: SpotWithAvailability[] }) {
  const router = useRouter();
  return (
    <MapContainer center={TEL_AVIV} zoom={13} className="map" scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {spots.map((s) => (
        <Marker
          key={s.id}
          position={[s.lat, s.lng]}
          icon={priceIcon(s.priceHourAgorot)}
          title={s.neighborhood}
          eventHandlers={{ click: () => router.push(`/spots/${s.id}`) }}
        />
      ))}
    </MapContainer>
  );
}
