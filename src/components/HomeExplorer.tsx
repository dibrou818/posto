"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PlaceWithRelations } from "@/lib/queries";
import { SearchBar } from "@/components/SearchBar";
import { PlaceCard } from "@/components/PlaceCard";
import { LocationWeather } from "@/components/LocationWeather";
import { haversineKm } from "@/lib/distance";
import { usePlacesExplorer, type UserLocation } from "@/lib/usePlacesExplorer";

const NEARBY_RADIUS_KM = 50;

export function HomeExplorer({ places }: { places: PlaceWithRelations[] }) {
  const router = useRouter();
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const { selectedTag, setSelectedTag, places: sortedPlaces } = usePlacesExplorer(
    places,
    userLocation,
  );

  const nearbyPlaces = useMemo(() => {
    if (!userLocation) return [];
    return places
      .map((place) => ({
        place,
        distanceKm: haversineKm(userLocation.lat, userLocation.lng, place.lat, place.lng),
      }))
      .filter(({ distanceKm }) => distanceKm <= NEARBY_RADIUS_KM)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 6);
  }, [places, userLocation]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <LocationWeather onLocated={setUserLocation} />

      {userLocation && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-gray-900">Près de chez vous</h2>
          {nearbyPlaces.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {nearbyPlaces.map(({ place, distanceKm }) => (
                <PlaceCard key={place.id} place={place} distanceKm={distanceKm} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              Aucun lieu à moins de {NEARBY_RADIUS_KM} km de votre position pour l&apos;instant.
            </p>
          )}
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar
          onSelectTag={setSelectedTag}
          onSelectResult={(r) => router.push(`/places/${r.place_id}`)}
          onSelectCity={(city) => router.push(`/map?lat=${city.lat}&lng=${city.lng}`)}
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
