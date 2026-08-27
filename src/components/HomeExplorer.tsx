"use client";

import { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { PlaceWithRelations } from "@/lib/queries";
import { SearchBar } from "@/components/SearchBar";
import { PlaceCard } from "@/components/PlaceCard";
import { haversineKm } from "@/lib/distance";

const Map = dynamic(() => import("@/components/Map").then((m) => m.Map), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
      Chargement de la carte...
    </div>
  ),
});

type TagResult = { id: string; slug: string; label: string };
type View = "map" | "list";

export function HomeExplorer({ places }: { places: PlaceWithRelations[] }) {
  const [selectedTag, setSelectedTag] = useState<TagResult | null>(null);
  const [view, setView] = useState<View>("map");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 5000 },
    );
  }, []);

  const filteredPlaces = useMemo(() => {
    if (!selectedTag) return places;
    return places.filter((p) => p.tags.some((t) => t.id === selectedTag.id));
  }, [places, selectedTag]);

  const sortedPlaces = useMemo(() => {
    if (!userLocation) return filteredPlaces;
    return [...filteredPlaces].sort(
      (a, b) =>
        haversineKm(userLocation.lat, userLocation.lng, a.lat, a.lng) -
        haversineKm(userLocation.lat, userLocation.lng, b.lat, b.lng),
    );
  }, [filteredPlaces, userLocation]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBar onSelectTag={(tag) => setSelectedTag(tag)} />
        <div className="flex items-center gap-2">
          {selectedTag && (
            <button
              onClick={() => setSelectedTag(null)}
              className="flex items-center gap-1 rounded-full bg-gray-900 px-3 py-1.5 text-xs font-medium text-white"
            >
              {selectedTag.label} ✕
            </button>
          )}
          <div className="flex rounded-lg border border-gray-300 bg-white p-0.5 text-sm">
            <button
              onClick={() => setView("map")}
              className={`rounded-md px-3 py-1.5 ${view === "map" ? "bg-gray-900 text-white" : "text-gray-600"}`}
            >
              Carte
            </button>
            <button
              onClick={() => setView("list")}
              className={`rounded-md px-3 py-1.5 ${view === "list" ? "bg-gray-900 text-white" : "text-gray-600"}`}
            >
              Liste
            </button>
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-500">
        {sortedPlaces.length} lieu{sortedPlaces.length > 1 ? "x" : ""} trouvé
        {sortedPlaces.length > 1 ? "s" : ""}
      </p>

      {view === "map" ? (
        <div className="h-[65vh] w-full overflow-hidden rounded-lg border border-gray-200">
          <Map places={sortedPlaces} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sortedPlaces.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              distanceKm={
                userLocation
                  ? haversineKm(userLocation.lat, userLocation.lng, place.lat, place.lng)
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
