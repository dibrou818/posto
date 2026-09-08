"use client";

import { useRouter } from "next/navigation";
import type { PlaceWithRelations } from "@/lib/queries";
import { SearchBar } from "@/components/SearchBar";
import { PlaceCard } from "@/components/PlaceCard";
import { haversineKm } from "@/lib/distance";
import { usePlacesExplorer } from "@/lib/usePlacesExplorer";

export function HomeExplorer({ places }: { places: PlaceWithRelations[] }) {
  const router = useRouter();
  const { selectedTag, setSelectedTag, userLocation, places: sortedPlaces } =
    usePlacesExplorer(places);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar
          onSelectTag={setSelectedTag}
          onSelectResult={(r) => router.push(`/places/${r.place_id}`)}
        />
        {selectedTag && (
          <button
            onClick={() => setSelectedTag(null)}
            className="flex w-fit items-center gap-1 rounded-full bg-gray-900 px-3 py-1.5 text-xs font-medium text-white"
          >
            {selectedTag.label} ✕
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500">
        {sortedPlaces.length} lieu{sortedPlaces.length > 1 ? "x" : ""} trouvé
        {sortedPlaces.length > 1 ? "s" : ""}
      </p>

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
    </div>
  );
}
