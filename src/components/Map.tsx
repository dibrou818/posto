"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import type { PlaceWithRelations } from "@/lib/queries";
import { isOpenNow } from "@/lib/opening-hours";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const PARIS_CENTER: [number, number] = [48.8566, 2.3522];

function FitBounds({ places }: { places: PlaceWithRelations[] }) {
  const map = useMap();

  useEffect(() => {
    if (places.length === 0) return;
    const bounds = L.latLngBounds(places.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [places, map]);

  return null;
}

export function Map({ places }: { places: PlaceWithRelations[] }) {
  return (
    <MapContainer
      center={PARIS_CENTER}
      zoom={12}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds places={places} />
      {places.map((place) => (
        <Marker key={place.id} position={[place.lat, place.lng]} icon={markerIcon}>
          <Popup>
            <div className="flex flex-col gap-1">
              <span className="font-semibold">{place.name}</span>
              <span className="text-xs text-gray-500">{place.address}</span>
              <span className="text-xs font-medium">
                {isOpenNow(place.opening_hours) ? "🟢 Ouvert" : "🔴 Fermé"}
              </span>
              <Link href={`/places/${place.id}`} className="text-xs text-blue-600 underline">
                Voir la fiche
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
