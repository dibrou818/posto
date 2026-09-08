"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { PlaceWithRelations } from "@/lib/queries";
import type { MapFocusTarget } from "@/components/Map";
import { SearchBar, type SearchResult } from "@/components/SearchBar";
import { usePlacesExplorer } from "@/lib/usePlacesExplorer";

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

export function FullScreenMap({ places }: { places: PlaceWithRelations[] }) {
  useLockBodyScroll();
  const { selectedTag, setSelectedTag, places: filteredPlaces } = usePlacesExplorer(places);
  const [focusTarget, setFocusTarget] = useState<MapFocusTarget | null>(null);

  function handleSelectResult(result: SearchResult) {
    // Re-selecting the same place should still re-trigger the zoom/popup
    // even if it's already the focus target.
    setFocusTarget({ id: result.place_id, lat: result.lat, lng: result.lng });
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
