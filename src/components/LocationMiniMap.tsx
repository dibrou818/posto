"use client";

import dynamic from "next/dynamic";

// Same reasoning as FullScreenMap's own dynamic import of Map: MapLibre
// needs real browser APIs (canvas/WebGL) that don't exist during server
// rendering, and there's no reason to ship its (sizeable) bundle to every
// place/event page's initial JS when the map itself only ever renders after
// hydration anyway.
const LocationMiniMapCanvas = dynamic(
  () => import("@/components/LocationMiniMapCanvas").then((m) => m.LocationMiniMapCanvas),
  {
    ssr: false,
    loading: () => <div className="h-52 w-full animate-pulse rounded-2xl bg-gray-100" />,
  },
);

/** Public entry point — place/event detail pages (Server Components) import
 * this directly; the actual MapLibre canvas lives in LocationMiniMapCanvas,
 * loaded client-side only (see above). Wrapped in the same rounded card
 * shell every other section of these pages uses, so it reads as one more
 * section, not an embedded widget from somewhere else. */
export function LocationMiniMap({ lat, lng, color }: { lat: number; lng: number; color: string }) {
  return (
    <div className="h-52 w-full overflow-hidden rounded-2xl border border-gray-200">
      <LocationMiniMapCanvas lat={lat} lng={lng} color={color} />
    </div>
  );
}
