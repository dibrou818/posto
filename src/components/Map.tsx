"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { PlaceWithRelations, EventWithPlace } from "@/lib/queries";
import { useIsMobileViewport } from "@/lib/viewport";
import { popupHtml, eventPopupHtml, EVENT_COLOR, PLACE_COLOR } from "@/lib/mapPopups";
import { applyFrenchLabels, applyCleanTheme, simplifyAttribution } from "@/lib/mapTheme";
import { setupUserLocationLayer, LOCATE_ZOOM } from "@/lib/mapUserLocation";
import { readUserLocation } from "@/lib/userLocationStore";

// MapLibre computes its tile-parsing Web Worker's URL as
// `new URL('./maplibre-gl-worker.mjs', import.meta.url)` — Webpack/Vite
// rewrite that to the real bundled path, but Turbopack (next dev's bundler)
// doesn't yet, so it resolves to a URL that 404s. The failure is silent:
// the Worker object still gets created, it just never runs any code, so
// every tile request sent to it sits in "loading" forever with no error —
// the map renders its bare background and nothing else. Pointing
// setWorkerUrl at our own copy (kept in sync with the installed version by
// scripts/copy-maplibre-worker.mjs, run on every `npm install`) sidesteps
// it. Module scope, not inside the component: it only needs to run once,
// before the first Map() is ever constructed, and this file is already
// client-only (dynamic-imported with ssr:false).
maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

// MapLibre/GeoJSON convention is [lng, lat] — the opposite order from
// Leaflet's [lat, lng]. Every coordinate pair in this file follows that.
const LILLE_CENTER: [number, number] = [3.0573, 50.6292];
const DEFAULT_ZOOM = 13;

// 85.0511° is the standard Web Mercator latitude limit — the projection
// itself breaks down past it (tends to infinity at the poles). Longitude
// needs no clamp: `renderWorldCopies` (on by default) already repeats the
// world horizontally forever, so there's no "edge" to fall off east/west.
//
// This deliberately isn't done via the map's own `maxBounds`/setMaxBounds —
// every input shape (a plain array, a nested [[w,s],[e,n]] array, a real
// LngLatBounds instance) reproducibly threw deep inside MapLibre 6.9.0's
// own constrain-to-bounds math the moment it was set. Clamping latitude by
// hand on "move" (below) gets the same "can't pan past the pole" result
// with zero calls into that code path.
const MAX_LATITUDE = 85.0511;

// OpenFreeMap's "Liberty" style: OpenStreetMap data via OpenMapTiles, free
// and unmetered, no API key. Chosen over Positron/Bright for its closer
// resemblance to the previous CARTO Voyager look (colorful roads/water/
// parks) while still being a full vector style — see the memory file
// mapbox-migration-plan.md for the reasoning behind leaving raster tiles.
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

// PLACE_COLOR/EVENT_COLOR both now live in lib/mapPopups.ts (EVENT_COLOR is
// also the badge color on an event's popup, which is what actually owns the
// value) — imported above so this layer's paint color and the popup's
// badge always agree without having to keep copies in sync.

// Remembers where the user left the map (center/zoom) across a full page
// navigation — e.g. tapping a pin's "Voir la fiche" and hitting back — so
// browsing several nearby spots doesn't mean re-zooming/re-panning from
// Lille every single time. sessionStorage, not localStorage: it should
// survive back-and-forth within one visit, not resurface days later and
// surprise a returning user with wherever they'd wandered off to last time.
const MAP_VIEW_STORAGE_KEY = "posto:map-view";

type StoredMapView = { lat: number; lng: number; zoom: number };

function readStoredView(): StoredMapView | null {
  try {
    const raw = sessionStorage.getItem(MAP_VIEW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.lat === "number" && typeof parsed?.lng === "number" && typeof parsed?.zoom === "number") {
      return parsed;
    }
    return null;
  } catch {
    // Private browsing, storage disabled, corrupted value, etc. — falling
    // back to the default view is fine, this is a nicety, not a dependency.
    return null;
  }
}

function writeStoredView(view: StoredMapView) {
  try {
    sessionStorage.setItem(MAP_VIEW_STORAGE_KEY, JSON.stringify(view));
  } catch {
    // ignore — see readStoredView
  }
}

// applyFrenchLabels/applyCleanTheme/simplifyAttribution now live in
// lib/mapTheme.ts, shared with LocationMiniMapCanvas.tsx's single-pin
// preview — one definition of "what this app's map looks like", not two
// that could quietly drift apart.

function placesToFeatureCollection(places: PlaceWithRelations[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: places.map((place) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [place.lng, place.lat] },
      properties: { id: place.id },
    })),
  };
}

function eventsToFeatureCollection(events: EventWithPlace[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: events.map((event) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [event.place.lng, event.place.lat] },
      properties: { id: event.id },
    })),
  };
}

// Cast to `any` for these two step expressions: MapLibre's exact expression
// type isn't re-exported from the top-level package, and the literal array
// shape is already validated at runtime by the style spec.
//
// A cluster used to render at roughly 3x an individual pin's size, which
// read as two unrelated marker languages on the same map. Now individual
// markers use this exact same circle-ring-plus-core paint (see
// UNCLUSTERED_RING_RADIUS/UNCLUSTERED_CORE_RADIUS below, fixed at this
// smallest tier's own size) so a user zooming past the point a cluster
// splits apart sees it settle into an ordinary pin, not a different marker
// language. The small step up per count tier beyond that still exists so
// "more pins here" remains legible at a glance.
const CLUSTER_RADIUS_STEPS = ["step", ["get", "point_count"], 15, 10, 19, 50, 23] as unknown as number;
const CLUSTER_CORE_RADIUS_STEPS = ["step", ["get", "point_count"], 10, 10, 13, 50, 16] as unknown as number;
// The smallest cluster tier's own radii, reused as-is (not just "close to")
// for individual pins — see the constant comment above.
const UNCLUSTERED_RING_RADIUS = 15;
const UNCLUSTERED_CORE_RADIUS = 10;

function addClusteredLayer(
  map: maplibregl.Map,
  opts: { id: string; data: GeoJSON.FeatureCollection<GeoJSON.Point>; color: string },
) {
  map.addSource(opts.id, {
    type: "geojson",
    data: opts.data,
    cluster: true,
    // How close two points' *screen* positions need to be (in pixels, at
    // whatever the current zoom is) to still merge into one cluster —
    // supercluster recomputes this fresh at every zoom level, not just once.
    // 50 grouped points that were already comfortably far enough apart to
    // tell apart on their own, so zooming in kept them merged well past the
    // point they'd have been readable as separate pins; a tighter radius
    // means a cluster only forms (and stays formed while zooming in) when
    // its points are genuinely crowded together on screen, not just in the
    // same general area — so it breaks apart into individual places/events
    // earlier, right around where they'd actually be distinguishable.
    clusterRadius: 35,
    clusterMaxZoom: 16,
  });

  // Soft outer glow, sized by count tier — a wide, low-opacity halo instead
  // of a hard-edged ring reads as depth/glow rather than a second outline
  // competing with the core's own white stroke.
  map.addLayer({
    id: `${opts.id}-cluster-ring`,
    type: "circle",
    source: opts.id,
    filter: ["has", "point_count"],
    paint: {
      "circle-radius": CLUSTER_RADIUS_STEPS,
      "circle-color": opts.color,
      "circle-opacity": 0.16,
      "circle-blur": 0.65,
    },
  });
  map.addLayer({
    id: `${opts.id}-cluster-core`,
    type: "circle",
    source: opts.id,
    filter: ["has", "point_count"],
    paint: {
      "circle-radius": CLUSTER_CORE_RADIUS_STEPS,
      "circle-color": opts.color,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
    },
  });
  map.addLayer({
    id: `${opts.id}-cluster-count`,
    type: "symbol",
    source: opts.id,
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": ["Noto Sans Bold"],
      "text-size": 10,
      // Without these, the basemap's own street/place labels can win the
      // collision check against the count and silently hide it — the count
      // is essential info on a cluster, not a nice-to-have, so it must
      // always win (same reasoning as the unclustered layers' own overlap
      // below).
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": "rgba(0,0,0,0.2)",
      "text-halo-width": 0.6,
    },
  });

  // Individual (unclustered) markers: the exact same ring+core circle pair
  // as a cluster, just fixed at the smallest tier's size and with no count
  // layer on top — a cluster with one pin in it, visually, since that's
  // genuinely what it is. Replaces the previous canvas-drawn gradient
  // dot/teardrop icons, which gave places and events their own distinct
  // raised-sticker look that no longer matched the flatter cluster style
  // once that was redesigned smaller.
  map.addLayer({
    id: `${opts.id}-unclustered-ring`,
    type: "circle",
    source: opts.id,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-radius": UNCLUSTERED_RING_RADIUS,
      "circle-color": opts.color,
      "circle-opacity": 0.16,
      "circle-blur": 0.65,
    },
  });
  map.addLayer({
    id: `${opts.id}-unclustered-core`,
    type: "circle",
    source: opts.id,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-radius": UNCLUSTERED_CORE_RADIUS,
      "circle-color": opts.color,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
    },
  });
}

export type MapFocusTarget = { id: string; lat: number; lng: number; zoom?: number };

// What the mobile bottom sheet (rendered by FullScreenMap, outside this
// component entirely) needs to show a preview — a place or an event marker
// was tapped. Exported so FullScreenMap/MapBottomSheet share the one shape.
export type MapSheetItem =
  | { kind: "place"; place: PlaceWithRelations }
  | { kind: "event"; event: EventWithPlace };

export function Map({
  places,
  events = [],
  focusTarget,
  onMapReady,
  onSelectPlace,
  onSelectEvent,
  onDismissSelection,
  onInteractionStart,
}: {
  places: PlaceWithRelations[];
  events?: EventWithPlace[];
  focusTarget?: MapFocusTarget | null;
  /** Called once the MapLibre map instance is ready, so a sibling component
   * can read/set its state directly — not currently used by anything, kept
   * as reusable plumbing for the next thing that needs it. */
  onMapReady?: (map: maplibregl.Map) => void;
  /** Below the `md` breakpoint, tapping a marker calls these instead of
   * opening a popup — FullScreenMap uses them to drive a mobile bottom
   * sheet. Above it, markers keep the regular popup and these are never
   * called. */
  onSelectPlace?: (place: PlaceWithRelations) => void;
  onSelectEvent?: (event: EventWithPlace) => void;
  /** Tapping the bare map dismisses the mobile bottom sheet, mirroring a
   * desktop popup closing on an outside click. */
  onDismissSelection?: () => void;
  /** Fired the moment the map starts moving — panning, pinching, scroll-
   * zooming, or an easeTo/flyTo animation (marker-click recentering
   * included). FullScreenMap uses this to close the filter panel, which a
   * click-outside listener alone wouldn't catch: dragging starts and ends
   * on the map canvas itself, so the panel would otherwise stay open while
   * the map slides around underneath it. */
  onInteractionStart?: () => void;
}) {
  const isMobile = useIsMobileViewport();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const navControlRef = useRef<maplibregl.NavigationControl | null>(null);
  const focusPopupRef = useRef<maplibregl.Popup | null>(null);

  const placesByIdRef = useRef<Record<string, PlaceWithRelations>>({});
  const eventsByIdRef = useRef<Record<string, EventWithPlace>>({});

  // Refs so click handlers registered once at map-creation time never go
  // stale, without needing to be re-registered (and re-diffed by MapLibre)
  // every time a prop's identity changes.
  const isMobileRef = useRef(isMobile);
  const onSelectPlaceRef = useRef(onSelectPlace);
  const onSelectEventRef = useRef(onSelectEvent);
  const onDismissSelectionRef = useRef(onDismissSelection);
  const onInteractionStartRef = useRef(onInteractionStart);
  useEffect(() => {
    isMobileRef.current = isMobile;
    onSelectPlaceRef.current = onSelectPlace;
    onSelectEventRef.current = onSelectEvent;
    onDismissSelectionRef.current = onDismissSelection;
    onInteractionStartRef.current = onInteractionStart;
  });

  const [initialView] = useState(() => readStoredView());
  // Falls back to a location already granted elsewhere this session (the
  // home page's own locate prompt, or an earlier map visit) — see
  // userLocationStore.ts. Only used when there's no explicit prior camera
  // position (initialView above) to respect instead: a deliberate pan/zoom
  // the visitor already did on the map itself always wins.
  const [initialUserLocation] = useState(() => (initialView ? null : readUserLocation()));
  // Set only if the map itself couldn't be created at all (most commonly
  // GPUInitializationError: the browser/GPU can't give MapLibre a WebGL2
  // context — hardware acceleration disabled, a blocklisted GPU driver,
  // running under remote desktop/VM without GPU passthrough, etc.). This is
  // thrown synchronously *inside* the `new maplibregl.Map()` call below, in
  // an effect — React error boundaries don't catch effect-phase throws, so
  // left uncaught this took down the whole page with a blank/crashed
  // screen and nothing a user could act on.
  const [initError, setInitError] = useState<string | null>(null);
  // Bumped by the fallback UI's retry button to force the mount effect
  // below to run again after a failed init — WebGL context creation can
  // fail transiently (a momentarily wedged GPU process, another tab
  // freeing up a context right after), so a plain retry with no page
  // reload is worth offering before telling someone to go dig through
  // browser settings.
  const [retryKey, setRetryKey] = useState(0);

  // Mount the map exactly once — or again, if `retryKey` changes (see the
  // fallback UI's retry button below). Every prop this closure reads is
  // otherwise captured through a ref (see the sync effect above) or handled
  // by its own effect further down — none of this re-runs on every render,
  // unlike react-leaflet's per-child-component model.
  useEffect(() => {
    const initialCenter: [number, number] = initialView
      ? [initialView.lng, initialView.lat]
      : initialUserLocation
        ? [initialUserLocation.lng, initialUserLocation.lat]
        : LILLE_CENTER;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current!,
        style: STYLE_URL,
        center: initialCenter,
        // LOCATE_ZOOM matches what a live locate's own flyTo already uses
        // (see mapUserLocation.ts) — opening already at that zoom reads as
        // "the same place a locate would have taken you", not a different,
        // unexplained framing.
        zoom: initialView?.zoom ?? (initialUserLocation ? LOCATE_ZOOM : DEFAULT_ZOOM),
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        attributionControl: false,
      });
    } catch (e) {
      // Deferred a tick (react-hooks/set-state-in-effect): setState must
      // not run synchronously inside an effect body, only from a callback.
      const message = e instanceof Error ? e.message : "Impossible d'initialiser la carte.";
      queueMicrotask(() => setInitError(message));
      return;
    }
    mapRef.current = map;

    // Fades the canvas in on "load" — style parsed and every source
    // declared in it registered, which is enough for a real first frame —
    // rather than waiting for "idle" (every tile *currently on screen*
    // finished loading too). "idle" gave a marginally cleaner first frame
    // (no tiles still visibly streaming in) but cost up to another second+
    // of blank placeholder on a cold cache; every other map product (Google/
    // Apple/Mapbox included) shows the basemap immediately and lets tiles
    // pop in progressively, which reads as fast rather than unfinished.
    // Toggled via direct style manipulation, not React state, since it's
    // purely presentational and doesn't need a re-render.
    map.once("load", () => {
      if (mapRef.current !== map) return;
      map.getContainer().style.opacity = "1";
      simplifyAttribution(map);
    });

    // The map is always north-up — see the removed leaflet-rotate feature
    // this replaces: raster labels couldn't rotate independently of the
    // tile image, so rotating flipped every place name upside-down. Vector
    // labels could stay upright via text-rotation-alignment, but rotation
    // stays off for now by choice; touchZoomRotate still needs its rotation
    // half explicitly disabled (pinch-zoom itself stays on).
    map.touchZoomRotate.disableRotation();

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");

    // The actual "locate me" button is added by setupUserLocationLayer
    // below, which is also where its click handler and status get wired up
    // — a second one used to get added here too, inert (no click handler),
    // which is why the button appeared to render twice.

    map.on("load", () => {
      // React Strict Mode's dev-mode mount→cleanup→mount double-invoke can
      // tear this exact instance down (cleanup below calls map.remove() and
      // nulls mapRef.current) before its style has actually finished
      // loading over the network — that's genuinely asynchronous, unlike
      // the synchronous double-invoke itself. Without this check, this
      // handler still fires on the by-then-removed instance and crashes
      // deep inside MapLibre's internals reading properties of now-null
      // internal state.
      if (mapRef.current !== map) return;

      applyFrenchLabels(map);
      applyCleanTheme(map);

      addClusteredLayer(map, {
        id: "places",
        data: placesToFeatureCollection(places),
        color: PLACE_COLOR,
      });
      addClusteredLayer(map, {
        id: "events",
        data: eventsToFeatureCollection(events),
        color: EVENT_COLOR,
      });

      // Now safe to run — see updateMinZoom's own isStyleLoaded guard below
      // for why it can't run any earlier than this.
      updateMinZoom();

      onMapReady?.(map);
    });

    // Single delegated click handler for every interactive layer — clicking
    // a cluster expands it, clicking a marker opens its popup (desktop) or
    // the mobile sheet, and clicking bare map dismisses the sheet.
    const interactiveLayers = [
      "places-cluster-ring",
      "places-cluster-core",
      "places-unclustered-ring",
      "places-unclustered-core",
      "events-cluster-ring",
      "events-cluster-core",
      "events-unclustered-ring",
      "events-unclustered-core",
    ];

    map.on("click", (e: maplibregl.MapMouseEvent) => {
      const style = map.getStyle();
      const layerIds = new Set((style?.layers ?? []).map((l) => l.id));
      const existingLayers = interactiveLayers.filter((id) => layerIds.has(id));
      const features = existingLayers.length > 0 ? map.queryRenderedFeatures(e.point, { layers: existingLayers }) : [];

      if (features.length === 0) {
        // Closes the desktop popup too, not just the mobile sheet
        // (onDismissSelection below) — closeOnClick is deliberately off on
        // the Popup itself (see showPopup's own comment), so without this a
        // popup stayed open forever once opened: clicking away from it did
        // nothing, and the tiny native close button was easy to miss (see
        // the CSS override in globals.css for the other half of that fix).
        focusPopupRef.current?.remove();
        onDismissSelectionRef.current?.();
        return;
      }

      const feature = features[0];
      const layerId = feature.layer.id;
      const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

      if (layerId === "places-cluster-ring" || layerId === "places-cluster-core") {
        expandCluster(map, "places", feature);
        return;
      }
      if (layerId === "events-cluster-ring" || layerId === "events-cluster-core") {
        expandCluster(map, "events", feature);
        return;
      }
      if (layerId === "places-unclustered-ring" || layerId === "places-unclustered-core") {
        const place = placesByIdRef.current[String(feature.properties?.id)];
        if (!place) return;
        // Same recenter animation as expandCluster's own easeTo — clicking a
        // single pin used to leave the map exactly where it was, only
        // popping the popup open at whatever screen position the pin
        // happened to be in (easy to end up cramped near an edge, or
        // several nearby event pins' popups overlapping). This brings that
        // pin to the center the same way a cluster click already does.
        map.easeTo({ center: coordinates });
        if (isMobileRef.current) {
          onSelectPlaceRef.current?.(place);
        } else {
          showPopup(map, focusPopupRef, coordinates, popupHtml(place));
        }
        return;
      }
      if (layerId === "events-unclustered-ring" || layerId === "events-unclustered-core") {
        const event = eventsByIdRef.current[String(feature.properties?.id)];
        if (!event) return;
        map.easeTo({ center: coordinates });
        if (isMobileRef.current) {
          onSelectEventRef.current?.(event);
        } else {
          showPopup(map, focusPopupRef, coordinates, eventPopupHtml(event));
        }
      }
    });

    // Covers drag, pinch/scroll-zoom, and any programmatic easeTo/flyTo
    // (including the recenter-on-marker-click above) — see onInteractionStart's
    // own doc comment for why FullScreenMap needs this instead of relying on
    // its filter panel's own click-outside listener alone.
    map.on("movestart", () => onInteractionStartRef.current?.());

    map.on("mousemove", (e: maplibregl.MapMouseEvent) => {
      const style = map.getStyle();
      const layerIds = new Set((style?.layers ?? []).map((l) => l.id));
      const existingLayers = interactiveLayers.filter((id) => layerIds.has(id));
      const hovering = existingLayers.length > 0 && map.queryRenderedFeatures(e.point, { layers: existingLayers }).length > 0;
      map.getCanvas().style.cursor = hovering ? "pointer" : "";
    });

    // Keeps the world basemap always filling the screen, at any viewport
    // size or zoom level. The latitude clamp above alone stops the user
    // panning past the top/bottom of the world, but a fixed minZoom can
    // still leave the *zoomed-out* world smaller than a big/ultrawide
    // viewport — showing blank background in a corner or strip regardless
    // of panning. So this recomputes, on every container resize, the
    // lowest zoom at which the world's rendered pixel size (256 * 2^zoom)
    // still covers the container in both dimensions.
    function updateMinZoom() {
      if (mapRef.current !== map || !map.isStyleLoaded()) return;
      map.resize();
      const container = map.getContainer();
      const largestDimension = Math.max(container.clientWidth, container.clientHeight);
      if (largestDimension <= 0) return;
      const requiredZoom = Math.ceil(Math.log2(largestDimension / 256));
      map.setMinZoom(Math.max(requiredZoom, 0));
    }
    updateMinZoom();
    // Coalesced to one call per animation frame: a ResizeObserver can fire
    // several times in quick succession for one continuous resize (e.g.
    // dragging a window edge, or a mobile browser's address bar sliding
    // away), and each call to updateMinZoom does a real resize() — running
    // every single one is wasted work that just makes that resize feel
    // less smooth.
    let resizeFrameId: number | undefined;
    const scheduleUpdateMinZoom = () => {
      if (resizeFrameId !== undefined) return;
      resizeFrameId = requestAnimationFrame(() => {
        resizeFrameId = undefined;
        updateMinZoom();
      });
    };
    const resizeObserver = new ResizeObserver(scheduleUpdateMinZoom);
    resizeObserver.observe(map.getContainer());

    // Hard-stops panning at the Mercator latitude limit (see MAX_LATITUDE)
    // — the manual equivalent of `maxBounds`'s vertical half, see its
    // comment for why. Checked on every "move" tick (not just at the end of
    // a drag) so it reads as an invisible wall you bump into, the same feel
    // maxBoundsViscosity gave the old Leaflet map, not a snap-back after the
    // fact. Only ever calls setCenter when actually out of range, so the
    // "move" event this itself triggers doesn't recurse.
    map.on("move", () => {
      const center = map.getCenter();
      const clampedLat = Math.min(Math.max(center.lat, -MAX_LATITUDE), MAX_LATITUDE);
      if (clampedLat !== center.lat) {
        map.setCenter([center.lng, clampedLat]);
      }
    });

    // Saves the current view every time panning/zooming settles, so the
    // next mount — typically the user coming back from a place/event's full
    // page — picks up right where they left off instead of resetting to
    // Lille. Debounced so a drag/pinch in progress doesn't write on every
    // intermediate frame.
    let persistTimeoutId: number | undefined;
    function persistViewNow() {
      const center = map.getCenter();
      writeStoredView({ lat: center.lat, lng: center.lng, zoom: map.getZoom() });
    }
    function schedulePersist() {
      if (persistTimeoutId !== undefined) window.clearTimeout(persistTimeoutId);
      persistTimeoutId = window.setTimeout(persistViewNow, 200);
    }
    map.on("moveend", schedulePersist);
    map.on("zoomend", schedulePersist);

    const removeUserLocationLayer = setupUserLocationLayer(
      map,
      initialUserLocation
        ? { lat: initialUserLocation.lat, lng: initialUserLocation.lng, approximate: initialUserLocation.approximate }
        : null,
    );

    return () => {
      if (persistTimeoutId !== undefined) window.clearTimeout(persistTimeoutId);
      try {
        persistViewNow();
      } catch {
        // Map may already be mid-teardown at this point; nothing to save.
      }
      resizeObserver.disconnect();
      if (resizeFrameId !== undefined) cancelAnimationFrame(resizeFrameId);
      removeUserLocationLayer();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey]);

  // Updates marker data without recreating the map or its layers — much
  // cheaper than react-leaflet's per-change marker-group rebuild. Deliberately
  // doesn't fitBounds to the new data: the map stays centered on Lille (or
  // wherever the visitor left it/asked to fly to) regardless of how the
  // filtered place set happens to be scattered — a single distant outlier
  // (bad geocoding, a typo) would otherwise be able to zoom the whole map
  // out to the point of uselessness.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    placesByIdRef.current = Object.fromEntries(places.map((p) => [p.id, p]));

    function applyData() {
      // Guards against this exact `map` instance having been torn down
      // (Strict Mode double-invoke, or a real unmount) by the time a
      // deferred "load" callback below actually fires.
      if (mapRef.current !== map) return;
      const source = map!.getSource("places") as maplibregl.GeoJSONSource | undefined;
      if (!source) return;
      source.setData(placesToFeatureCollection(places));
    }

    if (map.isStyleLoaded() && map.getSource("places")) {
      applyData();
    } else {
      map.once("load", applyData);
    }
  }, [places]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    eventsByIdRef.current = Object.fromEntries(events.map((e) => [e.id, e]));

    function applyData() {
      if (mapRef.current !== map) return;
      const source = map!.getSource("events") as maplibregl.GeoJSONSource | undefined;
      source?.setData(eventsToFeatureCollection(events));
    }

    if (map.isStyleLoaded() && map.getSource("events")) {
      applyData();
    } else {
      map.once("load", applyData);
    }
  }, [events]);

  // The zoom/+- control isn't needed on mobile (pinch-to-zoom already
  // works), so it's added/removed entirely there instead of fighting for
  // space with the search bar overlay — unlike the locate control (added
  // once in the mount effect), which stays on both.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function syncNavControl() {
      if (mapRef.current !== map) return;
      if (isMobile) {
        if (navControlRef.current) {
          try {
            map!.removeControl(navControlRef.current);
          } catch {
            // Already detached (e.g. the map tore down mid-toggle) —
            // nothing left to remove.
          }
          navControlRef.current = null;
        }
      } else if (!navControlRef.current) {
        const control = new maplibregl.NavigationControl({ showCompass: false });
        navControlRef.current = control;
        map!.addControl(control, "bottom-right");
      }
    }

    // Adding/removing a control before the map has finished its own initial
    // setup is what was crashing here (removeControl reading a property off
    // a control whose internal _map wiring wasn't fully established yet).
    if (map.isStyleLoaded()) syncNavControl();
    else map.once("load", syncNavControl);
  }, [isMobile]);

  // Search result / city selection: MapFocusTarget always already carries
  // the exact coordinates (the search API and city list return them
  // directly), so this can just fly there — no Leaflet-style "find the
  // marker, expand its cluster to reveal it" dance needed.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusTarget) return;

    function fly() {
      if (mapRef.current !== map) return;
      map!.flyTo({ center: [focusTarget!.lng, focusTarget!.lat], zoom: Math.max(map!.getZoom(), focusTarget!.zoom ?? 16) });

      const place = placesByIdRef.current[focusTarget!.id];
      const event = eventsByIdRef.current[focusTarget!.id];
      if (!place && !event) return;

      map!.once("moveend", () => {
        if (mapRef.current !== map) return;
        if (isMobileRef.current) {
          if (place) onSelectPlaceRef.current?.(place);
          else if (event) onSelectEventRef.current?.(event);
        } else {
          const html = place ? popupHtml(place) : eventPopupHtml(event!);
          showPopup(map!, focusPopupRef, [focusTarget!.lng, focusTarget!.lat], html);
        }
      });
    }

    if (map.isStyleLoaded()) fly();
    else map.once("load", fly);
  }, [focusTarget]);

  if (initError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gray-50 px-6 text-center">
        <p className="text-sm font-medium text-gray-900">La carte n&apos;a pas pu s&apos;afficher</p>
        <p className="max-w-sm text-sm text-gray-500">
          Votre navigateur n&apos;a pas pu activer l&apos;accélération graphique (WebGL2) nécessaire à la
          carte. Cela peut être temporaire — sinon, essayez d&apos;activer l&apos;accélération matérielle
          dans les réglages de votre navigateur, de fermer des onglets, ou d&apos;utiliser un autre
          navigateur.
        </p>
        <button
          type="button"
          onClick={() => {
            setInitError(null);
            setRetryKey((k) => k + 1);
          }}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/30"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full transition-opacity duration-500 ease-out"
      style={{ opacity: 0 }}
    />
  );
}

function showPopup(map: maplibregl.Map, popupRef: { current: maplibregl.Popup | null }, lngLat: [number, number], html: string) {
  popupRef.current?.remove();
  popupRef.current = new maplibregl.Popup({ offset: 14, closeButton: true, closeOnClick: false, maxWidth: "none" })
    .setLngLat(lngLat)
    .setHTML(html)
    .addTo(map);
}

function expandCluster(map: maplibregl.Map, sourceId: string, feature: maplibregl.MapGeoJSONFeature) {
  const clusterId = feature.properties?.cluster_id;
  const source = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
  if (!source || clusterId === undefined) return;
  const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
  source
    .getClusterExpansionZoom(clusterId)
    .then((zoom) => map.easeTo({ center: coordinates, zoom }))
    .catch(() => {
      // No matching cluster (e.g. the source data just changed) — nothing
      // to zoom to.
    });
}

