"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import type { PlaceWithRelations } from "@/lib/queries";
import { isOpenNow } from "@/lib/opening-hours";

const LILLE_CENTER: [number, number] = [50.6292, 3.0573];
const DEFAULT_ZOOM = 12;

// CARTO Voyager basemap. Anonymous usage is rate-limited; set
// NEXT_PUBLIC_CARTO_API_KEY once you have a CARTO account to lift the limits.
const CARTO_API_KEY = process.env.NEXT_PUBLIC_CARTO_API_KEY;
const CARTO_VOYAGER_URL = CARTO_API_KEY
  ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`
  : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

const placeIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:28px;height:28px;border-radius:50%;
    background:#111827;border:3px solid #ffffff;
    box-shadow:0 2px 6px rgba(0,0,0,0.35);
  "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

function clusterIcon(count: number) {
  const size = count < 10 ? 38 : count < 50 ? 46 : 56;
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:${size}px;height:${size}px;border-radius:50%;
        background:rgba(17,24,39,0.18);
        display:flex;align-items:center;justify-content:center;
      ">
        <div style="
          width:${size - 10}px;height:${size - 10}px;border-radius:50%;
          background:#111827;border:2.5px solid #ffffff;
          box-shadow:0 2px 8px rgba(0,0,0,0.35);
          display:flex;align-items:center;justify-content:center;
          color:#ffffff;font-weight:600;font-size:13px;font-family:inherit;
        ">${count}</div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function popupHtml(place: PlaceWithRelations) {
  const open = isOpenNow(place.opening_hours);
  return `
    <div style="display:flex;flex-direction:column;gap:4px;">
      <span style="font-weight:600;">${place.name}</span>
      <span style="font-size:12px;color:#6b7280;">${place.address ?? ""}</span>
      <span style="font-size:12px;font-weight:500;">${open ? "🟢 Ouvert" : "🔴 Fermé"}</span>
      <a href="/places/${place.id}" style="font-size:12px;color:#2563eb;text-decoration:underline;">
        Voir la fiche
      </a>
    </div>
  `;
}

function ClusteredMarkers({ places }: { places: PlaceWithRelations[] }) {
  const map = useMap();

  useEffect(() => {
    const group = L.markerClusterGroup({
      iconCreateFunction: (cluster) => clusterIcon(cluster.getChildCount()),
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 50,
    });

    places.forEach((place) => {
      const marker = L.marker([place.lat, place.lng], { icon: placeIcon });
      marker.bindPopup(popupHtml(place));
      group.addLayer(marker);
    });

    map.addLayer(group);

    if (places.length > 0) {
      const bounds = L.latLngBounds(places.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }

    return () => {
      map.removeLayer(group);
    };
  }, [places, map]);

  return null;
}

export function Map({ places }: { places: PlaceWithRelations[] }) {
  return (
    <MapContainer
      center={LILLE_CENTER}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url={CARTO_VOYAGER_URL}
        subdomains="abcd"
        maxZoom={20}
      />
      <ClusteredMarkers places={places} />
    </MapContainer>
  );
}
