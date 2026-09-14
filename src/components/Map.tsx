"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { PlaceWithRelations, EventWithPlace } from "@/lib/queries";
import { isOpenNow } from "@/lib/opening-hours";
import { formatEventDateBadge } from "@/lib/eventSchedule";

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

const PLACE_COLOR = "#111827";
// Violet, distinct from the dark place dot, so a glance at the map tells
// places and events apart even before opening anything.
const EVENT_COLOR = "#7c3aed";

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

// Same breakpoint as Tailwind's `md` (and the rest of the app's mobile/
// desktop split, e.g. BottomNav) — below it, tapping a pin opens the bottom
// sheet instead of a popup.
const MOBILE_BREAKPOINT_QUERY = "(max-width: 767px)";

function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);
  return isMobile;
}

// OpenFreeMap/OpenMapTiles labels are usually a single `["get","name"]`
// (or a coalesce over name:latin/name:nonlatin for non-Latin scripts) — none
// of that is configurable client-side the way CARTO's raster tiles weren't
// at all. Vector labels are just style-layer properties, so this walks every
// symbol layer whose text-field already renders a place name (roads'
// numbered shields use "ref", not "name", and are left untouched) and points
// it at the French name first, falling back to the generic one.
function applyFrenchLabels(map: maplibregl.Map) {
  const style = map.getStyle();
  if (!style?.layers) return;
  for (const layer of style.layers) {
    if (layer.type !== "symbol") continue;
    const textField = map.getLayoutProperty(layer.id, "text-field");
    if (textField === undefined) continue;
    let referencesName = false;
    try {
      referencesName = JSON.stringify(textField).includes('"name');
    } catch {
      continue;
    }
    if (!referencesName) continue;
    map.setLayoutProperty(layer.id, "text-field", ["coalesce", ["get", "name:fr"], ["get", "name"]]);
  }
}

// Leaflet's bindPopup(string)/MapLibre's Popup#setHTML(string) both inject
// the string as raw HTML with no escaping of their own — place.name/
// place.address are free text any signed-up user controls, so they must be
// entity-encoded before going anywhere near this template, or a malicious
// place name becomes stored XSS for every visitor who opens its popup on the
// public map.
function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

// escapeHtml is only safe inside a text node: the textContent→innerHTML
// round-trip encodes &/</> but not quote characters, since quotes have no
// special meaning there. Dropped into an attribute (the cover photo's
// src="...") an unescaped `"` could close the attribute early and inject
// markup — cover_photo_url is validated server-side against an allowlist,
// but this doesn't rely on that holding to stay safe.
function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Small inline icons for the popup card — kept as plain SVG markup (not
// React components) since this whole template is a string handed to
// Popup#setHTML, not JSX.
const PIN_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.5-7-11.5a7 7 0 0 1 14 0C19 14.5 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.2"/></svg>';
const CALENDAR_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M3.5 9.5h17"/><path d="M8 3v4"/><path d="M16 3v4"/></svg>';

// Shared "card" chrome for both popup types: an optional cover photo flush
// with the (CSS-overridden, see globals.css) rounded corners, then a padded
// body. Kept as one helper so a place popup and an event popup always read
// as the same kind of object, just with different content inside.
function popupCard(opts: {
  coverPhotoUrl: string | null;
  title: string;
  subtitle: string;
  badge: { label: string; bg: string; fg: string; dot?: string; icon?: string };
  href: string;
  cta: string;
}) {
  return `
    <div style="width:208px;">
      ${
        opts.coverPhotoUrl
          ? `<div style="width:100%;height:92px;background:#e5e7eb;">
               <img src="${escapeAttr(opts.coverPhotoUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" />
             </div>`
          : ""
      }
      <div style="padding:10px 12px 12px;display:flex;flex-direction:column;gap:6px;">
        <span style="font-weight:600;font-size:14px;line-height:1.25;color:#111827;">${escapeHtml(opts.title)}</span>
        ${
          opts.subtitle
            ? `<span style="display:flex;align-items:center;gap:4px;font-size:12px;color:#6b7280;overflow:hidden;">
                 <span style="flex-shrink:0;display:flex;">${PIN_ICON_SVG}</span>
                 <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(opts.subtitle)}</span>
               </span>`
            : ""
        }
        <span style="display:inline-flex;align-items:center;gap:5px;width:fit-content;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:600;background:${opts.badge.bg};color:${opts.badge.fg};">
          ${opts.badge.dot ? `<span style="width:6px;height:6px;border-radius:50%;background:${opts.badge.dot};"></span>` : ""}
          ${opts.badge.icon ? `<span style="display:flex;">${opts.badge.icon}</span>` : ""}
          ${escapeHtml(opts.badge.label)}
        </span>
        <a href="${opts.href}" style="margin-top:2px;display:block;text-align:center;padding:7px 10px;border-radius:8px;background:#111827;color:#ffffff;font-size:12px;font-weight:600;text-decoration:none;">
          ${escapeHtml(opts.cta)}
        </a>
      </div>
    </div>
  `;
}

function popupHtml(place: PlaceWithRelations) {
  const open = isOpenNow(place.opening_hours);
  return popupCard({
    coverPhotoUrl: place.cover_photo_url,
    title: place.name,
    subtitle: place.address ?? "",
    badge: open
      ? { label: "Ouvert", bg: "#dcfce7", fg: "#166534", dot: "#22c55e" }
      : { label: "Fermé", bg: "#fee2e2", fg: "#991b1b", dot: "#ef4444" },
    href: `/places/${place.id}`,
    cta: "Voir la fiche",
  });
}

function eventPopupHtml(event: EventWithPlace) {
  return popupCard({
    coverPhotoUrl: event.cover_photo_url ?? event.place.cover_photo_url,
    title: event.title,
    subtitle: event.place.name,
    badge: {
      label: formatEventDateBadge(event.start_datetime),
      bg: "#ede9fe",
      fg: EVENT_COLOR,
      icon: CALENDAR_ICON_SVG,
    },
    href: `/events/${event.id}`,
    cta: "Voir l'événement",
  });
}

// Blends `hex` toward white by `amount` (0-1) — used for the pins' gradient
// highlight, computed rather than hand-picked so it always stays a lighter
// shade of each marker's own color instead of a second color to keep in
// sync.
function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

// Symbol-layer icons for unclustered markers. Drawn once onto an offscreen
// canvas and registered via addImage — vector styles have no "just drop a
// colored <div>" shortcut like Leaflet's divIcon, this is the GL equivalent.
// pixelRatio 2 keeps them crisp on retina screens without a second draw.
// Both shapes get a soft drop shadow and a subtle top-left highlight
// (radial gradient, lighter than the flat base color) instead of a flat
// fill, so they read as a raised marker rather than a plain colored sticker.
function createDotIconImage(color: string): ImageData {
  const size = 72;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2;
  const cy = size / 2;
  // Extra inset (vs. the old flat version) leaves room for the shadow blur
  // to sit fully inside the canvas instead of clipping at its edge.
  const r = size / 2 - 14;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  const gradient = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.15, cx, cy, r);
  gradient.addColorStop(0, lightenColor(color, 0.35));
  gradient.addColorStop(1, color);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore(); // drops the shadow before the stroke, which shouldn't cast one

  ctx.lineWidth = 6;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();
  return ctx.getImageData(0, 0, size, size);
}

// A teardrop/pin shape (flat top-circle, pointed bottom) so events keep a
// visually distinct silhouette from places' plain dot, not just a color
// difference — anchored at its point (see icon-anchor: "bottom" below). The
// small punched-out white circle near the top is the classic map-pin motif
// (Google/Apple Maps both use it) — a second, shape-level cue that this is
// an event marker, readable even before color registers.
function createPinIconImage(color: string): ImageData {
  const width = 64;
  const height = 84;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const cx = width / 2;
  const r = width / 2 - 12;
  const cy = r + 12;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 0.15, Math.PI * 0.85, true);
  ctx.lineTo(cx, height - 10);
  ctx.closePath();
  const gradient = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.15, cx, cy, r * 1.3);
  gradient.addColorStop(0, lightenColor(color, 0.3));
  gradient.addColorStop(1, color);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();

  ctx.lineWidth = 6;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.36, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  return ctx.getImageData(0, 0, width, height);
}

function ensureIconsLoaded(map: maplibregl.Map) {
  if (!map.hasImage("place-dot")) {
    map.addImage("place-dot", createDotIconImage(PLACE_COLOR), { pixelRatio: 2 });
  }
  if (!map.hasImage("event-pin")) {
    map.addImage("event-pin", createPinIconImage(EVENT_COLOR), { pixelRatio: 2 });
  }
}

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
const CLUSTER_RADIUS_STEPS = ["step", ["get", "point_count"], 23, 10, 27, 50, 33] as unknown as number;
const CLUSTER_CORE_RADIUS_STEPS = ["step", ["get", "point_count"], 17, 10, 21, 50, 27] as unknown as number;

function addClusteredLayer(
  map: maplibregl.Map,
  opts: { id: string; data: GeoJSON.FeatureCollection<GeoJSON.Point>; color: string; icon: string; iconAnchor: "center" | "bottom" },
) {
  map.addSource(opts.id, {
    type: "geojson",
    data: opts.data,
    cluster: true,
    clusterRadius: 50,
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
      "circle-stroke-width": 3,
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
      "text-size": 14,
      // Without these, the basemap's own street/place labels can win the
      // collision check against the count and silently hide it — the count
      // is essential info on a cluster, not a nice-to-have, so it must
      // always win (same reasoning as icon-allow-overlap below).
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": "rgba(0,0,0,0.2)",
      "text-halo-width": 0.6,
    },
  });
  map.addLayer({
    id: `${opts.id}-unclustered`,
    type: "symbol",
    source: opts.id,
    filter: ["!", ["has", "point_count"]],
    layout: {
      "icon-image": opts.icon,
      "icon-size": 0.62,
      "icon-anchor": opts.iconAnchor,
      "icon-allow-overlap": true,
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
  useEffect(() => {
    isMobileRef.current = isMobile;
    onSelectPlaceRef.current = onSelectPlace;
    onSelectEventRef.current = onSelectEvent;
    onDismissSelectionRef.current = onDismissSelection;
  });

  const [initialView] = useState(() => readStoredView());
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
    const initialCenter: [number, number] = initialView ? [initialView.lng, initialView.lat] : LILLE_CENTER;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current!,
        style: STYLE_URL,
        center: initialCenter,
        zoom: initialView?.zoom ?? DEFAULT_ZOOM,
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

      // The tile source's attribution string is a single atomic blob —
      // "OpenFreeMap © OpenMapTiles Data from OpenStreetMap" — that
      // AttributionControl has no option to cherry-pick from, since the
      // three credits aren't separate entries; only the resulting DOM node
      // can be edited. OpenStreetMap's own data licence is the one that
      // actually requires attribution here, so this keeps just that one.
      // Overwriting unconditionally (not reading the existing text first)
      // means it doesn't matter whether the control has already built its
      // real attribution string by this point or not.
      const attribInner = map.getContainer().querySelector(".maplibregl-ctrl-attrib-inner");
      if (attribInner) {
        attribInner.innerHTML =
          '<a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap</a>';
      }
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
      ensureIconsLoaded(map);

      addClusteredLayer(map, {
        id: "places",
        data: placesToFeatureCollection(places),
        color: PLACE_COLOR,
        icon: "place-dot",
        iconAnchor: "center",
      });
      addClusteredLayer(map, {
        id: "events",
        data: eventsToFeatureCollection(events),
        color: EVENT_COLOR,
        icon: "event-pin",
        iconAnchor: "bottom",
      });

      // Now safe to run — see updateMinZoom's own isStyleLoaded guard below
      // for why it can't run any earlier than this.
      updateMinZoom();

      onMapReady?.(map);
    });

    // Single delegated click handler for every interactive layer — clicking
    // a cluster expands it, clicking a marker opens its popup (desktop) or
    // the mobile sheet, and clicking bare map dismisses the sheet.
    const interactiveLayers = ["places-cluster-ring", "places-cluster-core", "places-unclustered", "events-cluster-ring", "events-cluster-core", "events-unclustered"];

    map.on("click", (e: maplibregl.MapMouseEvent) => {
      const style = map.getStyle();
      const layerIds = new Set((style?.layers ?? []).map((l) => l.id));
      const existingLayers = interactiveLayers.filter((id) => layerIds.has(id));
      const features = existingLayers.length > 0 ? map.queryRenderedFeatures(e.point, { layers: existingLayers }) : [];

      if (features.length === 0) {
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
      if (layerId === "places-unclustered") {
        const place = placesByIdRef.current[String(feature.properties?.id)];
        if (!place) return;
        if (isMobileRef.current) {
          onSelectPlaceRef.current?.(place);
        } else {
          showPopup(map, focusPopupRef, coordinates, popupHtml(place));
        }
        return;
      }
      if (layerId === "events-unclustered") {
        const event = eventsByIdRef.current[String(feature.properties?.id)];
        if (!event) return;
        if (isMobileRef.current) {
          onSelectEventRef.current?.(event);
        } else {
          showPopup(map, focusPopupRef, coordinates, eventPopupHtml(event));
        }
      }
    });

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

    const removeUserLocationLayer = setupUserLocationLayer(map);

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

type LocateStatus = "idle" | "locating" | "active" | "denied";

// The classic "recenter on me" navigation arrow used by most map apps
// (Google Maps, Apple Maps, etc.) — a simple filled arrowhead pointing
// up-right, rather than a crosshair.
function locateButtonIcon(status: LocateStatus) {
  const color = status === "active" ? "#2563eb" : status === "denied" ? "#dc2626" : "#374151";
  return `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="${color}" stroke="${color}" stroke-width="1" stroke-linejoin="round">
      <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
    </svg>
  `;
}

/** Custom MapLibre control (bottom-right, next to the zoom control) that
 * lets the user request their live position on the map. */
class LocateControl implements maplibregl.IControl {
  private button: HTMLButtonElement | null = null;
  private onClickHandler: (() => void) | null = null;

  onAdd(): HTMLElement {
    const container = document.createElement("div");
    container.className = "maplibregl-ctrl maplibregl-ctrl-group";
    // Round, not the library's own default square-ish group shape — the
    // classic "recenter on me" button shape shared by most map apps, and
    // this control is always alone in its group so there's no shared-edge
    // styling with a neighbor to preserve.
    container.style.cssText = "border-radius:9999px;overflow:hidden;";
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", "Me localiser");
    button.style.cssText =
      "width:34px;height:34px;display:flex;align-items:center;justify-content:center;background:#fff;border:none;border-radius:9999px;cursor:pointer;";
    button.innerHTML = locateButtonIcon("idle");
    button.addEventListener("click", () => this.onClickHandler?.());
    this.button = button;
    container.appendChild(button);
    return container;
  }

  onRemove(): void {
    this.button = null;
  }

  setStatus(status: LocateStatus) {
    if (this.button) this.button.innerHTML = locateButtonIcon(status);
  }

  setOnClick(handler: () => void) {
    this.onClickHandler = handler;
  }
}

/** Plain pulsing "you are here" blue dot — no heading/direction indicator,
 * just the position itself — plus an accuracy circle. Live via
 * watchPosition; first fix auto-centers, later updates just follow. Returns
 * a cleanup function. */
function setupUserLocationLayer(map: maplibregl.Map): () => void {
  let marker: maplibregl.Marker | null = null;
  let watchId: number | null = null;
  let hasCentered = false;
  let latestLat = 0;
  let latestAccuracy = 0;

  const el = document.createElement("div");
  el.style.cssText = "position:relative;width:18px;height:18px;";
  el.innerHTML = `
    <div class="posto-locate-pulse" style="position:absolute;inset:0;border-radius:50%;background:#2563eb;"></div>
    <div style="position:absolute;inset:0;border-radius:50%;background:#2563eb;border:3px solid #ffffff;box-shadow:0 0 0 1px rgba(37,99,235,0.4),0 1px 4px rgba(0,0,0,0.35);"></div>
  `;

  function updateAccuracyCircleRadius() {
    const source = map.getSource("user-accuracy") as maplibregl.GeoJSONSource | undefined;
    if (!source || latestAccuracy === 0) return;
    // Standard Web Mercator ground-resolution formula: meters per pixel at a
    // given zoom and latitude, for the usual 256px tile scheme.
    const metersPerPixel = (156543.03392 * Math.cos((latestLat * Math.PI) / 180)) / Math.pow(2, map.getZoom());
    const pixelRadius = latestAccuracy / metersPerPixel;
    if (map.getLayer("user-accuracy-fill")) {
      map.setPaintProperty("user-accuracy-fill", "circle-radius", pixelRadius);
    }
  }

  function ensureAccuracyLayer() {
    if (map.getSource("user-accuracy")) return;
    map.addSource("user-accuracy", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    map.addLayer({
      id: "user-accuracy-fill",
      type: "circle",
      source: "user-accuracy",
      paint: {
        "circle-radius": 0,
        "circle-color": "#2563eb",
        "circle-opacity": 0.1,
        "circle-stroke-width": 1,
        "circle-stroke-color": "#2563eb",
      },
    });
  }

  function updatePosition(lat: number, lng: number, accuracy: number) {
    latestLat = lat;
    latestAccuracy = accuracy;
    if (map.isStyleLoaded()) ensureAccuracyLayer();
    else map.once("load", ensureAccuracyLayer);

    const source = map.getSource("user-accuracy") as maplibregl.GeoJSONSource | undefined;
    source?.setData({
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: {} }],
    });
    updateAccuracyCircleRadius();

    if (!marker) {
      marker = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([lng, lat]).addTo(map);
    } else {
      marker.setLngLat([lng, lat]);
    }
  }

  const control = new LocateControl();
  map.addControl(control, "bottom-right");

  function startWatching() {
    control.setStatus("locating");
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        control.setStatus("active");
        updatePosition(latitude, longitude, accuracy);
        if (!hasCentered) {
          hasCentered = true;
          map.flyTo({ center: [longitude, latitude], zoom: Math.max(map.getZoom(), 15) });
        }
      },
      () => control.setStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
  }

  control.setOnClick(() => {
    if (!navigator.geolocation) {
      control.setStatus("denied");
      return;
    }
    if (marker) {
      map.flyTo({ center: marker.getLngLat(), zoom: Math.max(map.getZoom(), 15) });
      return;
    }
    startWatching();
  });

  map.on("zoom", updateAccuracyCircleRadius);

  return () => {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    marker?.remove();
    map.off("zoom", updateAccuracyCircleRadius);
  };
}
