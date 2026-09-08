"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import type { PlaceWithRelations } from "@/lib/queries";
import type { MapFocusTarget } from "@/components/Map";
import { SearchBar, type SearchResult, type CityResult } from "@/components/SearchBar";
import { usePlacesExplorer } from "@/lib/usePlacesExplorer";

const CITY_ZOOM = 12;

const Map = dynamic(() => import("@/components/Map").then((m) => m.Map), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
      Chargement de la carte...
    </div>
  ),
});

/** Prevents the page behind the map from scrolling/bouncing on mobile while
 * this view is mounted — only the map itself should pan, not the page. */
function useLockBodyScroll() {
  useEffect(() => {
    const { style } = document.body;
    const previousOverflow = style.overflow;
    const previousOverscroll = style.overscrollBehavior;
    style.overflow = "hidden";
    style.overscrollBehavior = "none";
    return () => {
      style.overflow = previousOverflow;
      style.overscrollBehavior = previousOverscroll;
    };
  }, []);
}

/** Reads ?lat=&lng= (set when a city was picked from the search bar on
 * another page — see HomeExplorer) so the map opens already centered there. */
function useInitialCityFocus(): MapFocusTarget | null {
  const searchParams = useSearchParams();
  const latParam = searchParams.get("lat");
  const lngParam = searchParams.get("lng");
  // `.get()` returns null when the param is absent, and Number(null) is 0
  // (not NaN) — without this check every plain visit to /map would "focus"
  // on [0, 0], off the coast of Africa, instead of falling back to Lille.
  if (!latParam || !lngParam) return null;

  const lat = Number(latParam);
  const lng = Number(lngParam);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { id: "city:initial", lat, lng, zoom: CITY_ZOOM };
}

export function FullScreenMap({ places }: { places: PlaceWithRelations[] }) {
  useLockBodyScroll();
  const { selectedTag, setSelectedTag, places: filteredPlaces } = usePlacesExplorer(places);
  const [focusTarget, setFocusTarget] = useState<MapFocusTarget | null>(useInitialCityFocus());

  function handleSelectResult(result: SearchResult) {
    // Re-selecting the same place should still re-trigger the zoom/popup
    // even if it's already the focus target.
    setFocusTarget({ id: result.place_id, lat: result.lat, lng: result.lng });
  }

  function handleSelectCity(city: CityResult) {
    // No marker will ever match this id, so Map falls back to a plain
    // flyTo — exactly what a city/area target needs (no popup to open).
    setFocusTarget({ id: `city:${city.label}:${Date.now()}`, lat: city.lat, lng: city.lng, zoom: CITY_ZOOM });
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div className="absolute inset-0">
        <Map places={filteredPlaces} focusTarget={focusTarget} />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex flex-col gap-2 p-3">
        <div className="pointer-events-auto">
          <SearchBar
            onSelectTag={setSelectedTag}
            onSelectResult={handleSelectResult}
            onSelectCity={handleSelectCity}
            placeholder="Rechercher un lieu, une ville, un événement..."
          />
        </div>
        {selectedTag && (
          <button
            onClick={() => setSelectedTag(null)}
            className="pointer-events-auto flex w-fit items-center gap-1 rounded-full bg-gray-900 px-3 py-1.5 text-xs font-medium text-white shadow"
          >
            {selectedTag.label} ✕
          </button>
        )}
      </div>
    </div>
  );
}
