"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import type L from "leaflet";
import type { PlaceWithRelations, EventWithPlace } from "@/lib/queries";
import type { MapFocusTarget, MapSheetItem } from "@/components/Map";
import { SearchBar, type SearchResult, type CityResult } from "@/components/SearchBar";
import { MapCompass } from "@/components/MapCompass";
import { KindFilter } from "@/components/KindFilter";
import { EventDateFilter } from "@/components/EventDateFilter";
import { MapBottomSheet } from "@/components/MapBottomSheet";
import { usePlacesExplorer } from "@/lib/usePlacesExplorer";
import type { ResultKindFilter } from "@/lib/resultFilter";
import { matchesDateBucket, type EventDateBucket } from "@/lib/eventDateFilter";

const CITY_ZOOM = 12;

const Map = dynamic(() => import("@/components/Map").then((m) => m.Map), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
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

export function FullScreenMap({
  places,
  events,
}: {
  places: PlaceWithRelations[];
  events: EventWithPlace[];
}) {
  useLockBodyScroll();
  const { selectedTag, setSelectedTag, places: filteredPlaces } = usePlacesExplorer(places);
  const [focusTarget, setFocusTarget] = useState<MapFocusTarget | null>(useInitialCityFocus());
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [kindFilter, setKindFilter] = useState<ResultKindFilter>("all");
  const [dateBucket, setDateBucket] = useState<EventDateBucket>("all");
  // Mobile-only: which pin's preview the bottom sheet is showing (see
  // Map.tsx's onSelectPlace/onSelectEvent — desktop never sets this, it
  // keeps using Leaflet's own popup instead).
  const [sheetItem, setSheetItem] = useState<MapSheetItem | null>(null);

  const tagFilteredEvents = useMemo(
    () => (selectedTag ? events.filter((e) => e.tag_id === selectedTag.id) : events),
    [events, selectedTag],
  );

  // Which markers are actually shown follows the Lieux/Événements toggle —
  // "place" hides events entirely and vice versa, "all" shows both.
  const visiblePlaces = kindFilter === "event" ? [] : filteredPlaces;
  const visibleEvents = useMemo(() => {
    if (kindFilter === "place") return [];
    return tagFilteredEvents.filter((e) => matchesDateBucket(e.start_datetime, dateBucket));
  }, [tagFilteredEvents, kindFilter, dateBucket]);

  function handleSelectResult(result: SearchResult) {
    // Events are keyed by their own id on the map (see EventClusteredMarkers),
    // places by place_id — same field the search API already returns.
    const id = result.result_type === "event" ? result.id : result.place_id;
    // Re-selecting the same place should still re-trigger the zoom/popup
    // even if it's already the focus target.
    setFocusTarget({ id, lat: result.lat, lng: result.lng });
  }

  function handleSelectCity(city: CityResult) {
    // No marker will ever match this id, so Map falls back to a plain
    // flyTo — exactly what a city/area target needs (no popup to open).
    setFocusTarget({ id: `city:${city.label}:${Date.now()}`, lat: city.lat, lng: city.lng, zoom: CITY_ZOOM });
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div className="absolute inset-0">
        <Map
          places={visiblePlaces}
          events={visibleEvents}
          focusTarget={focusTarget}
          onMapReady={setMapInstance}
          onSelectPlace={(place) => setSheetItem({ kind: "place", place })}
          onSelectEvent={(event) => setSheetItem({ kind: "event", event })}
          onDismissSelection={() => setSheetItem(null)}
        />
      </div>

      <MapBottomSheet item={sheetItem} onClose={() => setSheetItem(null)} />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex flex-col gap-2 p-3">
        <div className="flex items-start gap-2">
          <div className="pointer-events-auto min-w-0 flex-1">
            <SearchBar
              onSelectTag={setSelectedTag}
              onSelectResult={handleSelectResult}
              onSelectCity={handleSelectCity}
              placeholder="Rechercher un lieu, une ville, un événement..."
              filter={kindFilter}
              onFilterChange={setKindFilter}
            />
          </div>
          <div className="pointer-events-auto shrink-0">
            <KindFilter value={kindFilter} onChange={setKindFilter} />
          </div>
          <div className="pointer-events-auto">
            <MapCompass map={mapInstance} />
          </div>
        </div>
        {kindFilter !== "place" && (
          <div className="pointer-events-auto">
            <EventDateFilter value={dateBucket} onChange={setDateBucket} />
          </div>
        )}
        {selectedTag && (
          <button
            onClick={() => setSelectedTag(null)}
            className="pointer-events-auto flex w-fit items-center gap-1 rounded-full bg-gray-900 px-3 py-1.5 text-xs font-medium text-white shadow-md transition-colors hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/30"
          >
            {selectedTag.label} ✕
          </button>
        )}
      </div>
    </div>
  );
}
