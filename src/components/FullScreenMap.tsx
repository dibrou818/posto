"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import type { PlaceWithRelations, EventWithPlace } from "@/lib/queries";
import type { MapFocusTarget, MapSheetItem } from "@/components/Map";
import { SearchBar, type SearchResult, type CityResult } from "@/components/SearchBar";
import { MapFilterButton } from "@/components/MapFilterButton";
import { MapBottomSheet } from "@/components/MapBottomSheet";
import { usePlacesExplorer } from "@/lib/usePlacesExplorer";
import type { ResultKindFilter } from "@/lib/resultFilter";
import { matchesEventDateFilter, ALL_EVENT_DATES, type EventDateFilterValue } from "@/lib/eventDateFilter";
import { eventMatchesTag } from "@/lib/eventTags";

const CITY_ZOOM = 12;

// Close to the Liberty style's own background tone (a warm off-white, not
// stark white) so the moment the real map's canvas fades in over this isn't
// itself a visible color jump — this is a placeholder to hand off from, not
// something the user should consciously register as "the loading screen".
const Map = dynamic(() => import("@/components/Map").then((m) => m.Map), {
  ssr: false,
  loading: () => <div className="h-full w-full" style={{ background: "#f2efe6" }} />,
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
  const [kindFilter, setKindFilter] = useState<ResultKindFilter>("all");
  const [dateFilter, setDateFilter] = useState<EventDateFilterValue>(ALL_EVENT_DATES);
  // Lifted out of MapFilterButton (controlled, see its own props) so the map
  // itself can close the panel the moment it starts moving — see Map's
  // onInteractionStart doc comment.
  const [filterOpen, setFilterOpen] = useState(false);
  // Mobile-only: which pin's preview the bottom sheet is showing (see
  // Map.tsx's onSelectPlace/onSelectEvent — desktop never sets this, it
  // keeps using Leaflet's own popup instead).
  const [sheetItem, setSheetItem] = useState<MapSheetItem | null>(null);

  const tagFilteredEvents = useMemo(
    () => (selectedTag ? events.filter((e) => eventMatchesTag(e, selectedTag.id)) : events),
    [events, selectedTag],
  );

  // Which markers are actually shown follows the Lieux/Événements toggle —
  // "place" hides events entirely and vice versa, "all" shows both.
  const visiblePlaces = kindFilter === "event" ? [] : filteredPlaces;
  const visibleEvents = useMemo(() => {
    if (kindFilter === "place") return [];
    return tagFilteredEvents.filter((e) => matchesEventDateFilter(e.start_datetime, dateFilter));
  }, [tagFilteredEvents, kindFilter, dateFilter]);

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
    // flyTo — exactly what a city/area (or street address — same shape,
    // see SearchBar's "address" bucket) target needs (no popup to open).
    // A picked address carries its own tighter zoom; a city has none and
    // falls back to the wide CITY_ZOOM.
    setFocusTarget({ id: `city:${city.label}:${Date.now()}`, lat: city.lat, lng: city.lng, zoom: city.zoom ?? CITY_ZOOM });
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div className="absolute inset-0">
        <Map
          places={visiblePlaces}
          events={visibleEvents}
          focusTarget={focusTarget}
          onSelectPlace={(place) => setSheetItem({ kind: "place", place })}
          onSelectEvent={(event) => setSheetItem({ kind: "event", event })}
          onDismissSelection={() => setSheetItem(null)}
          onInteractionStart={() => setFilterOpen(false)}
        />
      </div>

      <MapBottomSheet item={sheetItem} onClose={() => setSheetItem(null)} />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex flex-col items-center gap-2 p-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <div className="flex w-full max-w-xl items-center gap-2">
          <div className="pointer-events-auto min-w-0 flex-1">
            <SearchBar
              onSelectTag={setSelectedTag}
              onSelectResult={handleSelectResult}
              onSelectCity={handleSelectCity}
              placeholder="Rechercher un lieu, une ville, un événement..."
              filter={kindFilter}
              onFilterChange={setKindFilter}
              inputRoundingClassName="rounded-full"
            />
          </div>
          <div className="pointer-events-auto shrink-0">
            <MapFilterButton
              kindFilter={kindFilter}
              onKindFilterChange={setKindFilter}
              dateFilter={dateFilter}
              onDateFilterChange={setDateFilter}
              open={filterOpen}
              onOpenChange={setFilterOpen}
            />
          </div>
        </div>
        {selectedTag && (
          <button
            onClick={() => setSelectedTag(null)}
            className="pointer-events-auto flex w-fit items-center gap-1 self-start rounded-full bg-gray-900 px-3 py-1.5 text-xs font-medium text-white shadow-md transition-colors hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/30"
          >
            {selectedTag.label} ✕
          </button>
        )}
      </div>
    </div>
  );
}
