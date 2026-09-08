"use client";

import { useEffect, useMemo, useState } from "react";
import type { PlaceWithRelations } from "@/lib/queries";
import { haversineKm } from "@/lib/distance";

export type TagFilter = { id: string; slug: string; label: string };

export function usePlacesExplorer(places: PlaceWithRelations[]) {
  const [selectedTag, setSelectedTag] = useState<TagFilter | null>(null);
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

  return {
    selectedTag,
    setSelectedTag,
    userLocation,
    places: sortedPlaces,
  };
}
