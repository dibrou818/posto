"use client";

import { useMemo, useState } from "react";
import type { PlaceWithRelations } from "@/lib/queries";
import { haversineKm } from "@/lib/distance";

export type TagFilter = { id: string; slug: string; label: string };
export type UserLocation = { lat: number; lng: number };

/** Tag-filters and (when a location is known) distance-sorts a place list.
 * Location isn't requested here — callers pass it in once the user has
 * explicitly opted in (see LocationWeather), so no silent permission
 * prompt fires just from rendering this hook. */
export function usePlacesExplorer(places: PlaceWithRelations[], userLocation?: UserLocation | null) {
  const [selectedTag, setSelectedTag] = useState<TagFilter | null>(null);

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

  return {
    selectedTag,
    setSelectedTag,
    places: sortedPlaces,
  };
}
