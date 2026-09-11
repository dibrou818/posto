"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, ZoomControl, useMap, useMapEvent } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import type { PlaceWithRelations, EventWithPlace } from "@/lib/queries";
import { isOpenNow } from "@/lib/opening-hours";

const eventDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const LILLE_CENTER: [number, number] = [50.6292, 3.0573];
const DEFAULT_ZOOM = 13;

// 85.0511° is the standard Web Mercator latitude limit (where the
// projection would otherwise reach infinity) — capping the map here, and
// clamping panning to it below, is what stops a corner of the screen from
// ever showing bare background past the edge of the world.
const WORLD_BOUNDS = L.latLngBounds([-85.0511, -180], [85.0511, 180]);

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

// CARTO Voyager basemap. Anonymous usage is rate-limited; set
// NEXT_PUBLIC_CARTO_API_KEY once you have a CARTO account to lift the limits.
const CARTO_API_KEY = process.env.NEXT_PUBLIC_CARTO_API_KEY;
const CARTO_VOYAGER_URL = CARTO_API_KEY
  ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`
  : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

const placeIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:28px;height:28px;border-radius:50%;
    background:#111827;border:3px solid #ffffff;
    box-shadow:0 2px 6px rgba(0,0,0,0.35);
  "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

function clusterIcon(count: number) {
  const size = count < 10 ? 38 : count < 50 ? 46 : 56;
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:${size}px;height:${size}px;border-radius:50%;
        background:rgba(17,24,39,0.18);
        display:flex;align-items:center;justify-content:center;
      ">
        <div style="
          width:${size - 10}px;height:${size - 10}px;border-radius:50%;
          background:#111827;border:2.5px solid #ffffff;
          box-shadow:0 2px 8px rgba(0,0,0,0.35);
          display:flex;align-items:center;justify-content:center;
          color:#ffffff;font-weight:600;font-size:13px;font-family:inherit;
        ">${count}</div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Violet, distinct from the dark place dot, so a glance at the map tells
// places and events apart even before opening a popup.
const EVENT_COLOR = "#7c3aed";

const eventIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:28px;height:28px;border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    background:${EVENT_COLOR};border:3px solid #ffffff;
    box-shadow:0 2px 6px rgba(0,0,0,0.35);
  "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 26],
  popupAnchor: [0, -24],
});

function eventClusterIcon(count: number) {
  const size = count < 10 ? 38 : count < 50 ? 46 : 56;
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:${size}px;height:${size}px;border-radius:50%;
        background:rgba(124,58,237,0.18);
        display:flex;align-items:center;justify-content:center;
      ">
        <div style="
          width:${size - 10}px;height:${size - 10}px;border-radius:50%;
          background:${EVENT_COLOR};border:2.5px solid #ffffff;
          box-shadow:0 2px 8px rgba(0,0,0,0.35);
          display:flex;align-items:center;justify-content:center;
          color:#ffffff;font-weight:600;font-size:13px;font-family:inherit;
        ">${count}</div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

type LocateStatus = "idle" | "locating" | "active" | "denied";

/** Plain pulsing "you are here" blue dot — no heading/direction indicator,
 * just the position itself. */
function userLocationIcon() {
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:18px;height:18px;">
        <div class="posto-locate-pulse" style="
          position:absolute;inset:0;border-radius:50%;background:#2563eb;
        "></div>
        <div style="
          position:absolute;inset:0;border-radius:50%;
          background:#2563eb;border:3px solid #ffffff;
          box-shadow:0 0 0 1px rgba(37,99,235,0.4),0 1px 4px rgba(0,0,0,0.35);
        "></div>
      </div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function locateButtonIcon(status: LocateStatus) {
  const color = status === "active" ? "#2563eb" : status === "denied" ? "#dc2626" : "#374151";
  return `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3"></path>
    </svg>
  `;
}

/** Custom Leaflet control (bottom-right, next to the zoom control) that lets
 * the user request their live position on the map — a plain button rather
 * than a React node, since Leaflet's control container isn't part of the
 * React tree. */
function LocateControl({ status, onClick }: { status: LocateStatus; onClick: () => void }) {
  const map = useMap();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const onClickRef = useRef(onClick);

  useEffect(() => {
    onClickRef.current = onClick;
  }, [onClick]);

  useEffect(() => {
    const control = new L.Control({ position: "bottomright" });
    control.onAdd = () => {
      const button = L.DomUtil.create("button") as HTMLButtonElement;
      button.type = "button";
      button.setAttribute("aria-label", "Me localiser");
      button.style.cssText =
        "width:34px;height:34px;display:flex;align-items:center;justify-content:center;" +
        "background:#fff;border-radius:8px;cursor:pointer;border:none;" +
        "box-shadow:0 1px 4px rgba(0,0,0,0.3);";
      L.DomEvent.disableClickPropagation(button);
      L.DomEvent.on(button, "click", () => onClickRef.current());
      buttonRef.current = button;
      return button;
    };
    control.addTo(map);
    return () => {
      control.remove();
      buttonRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    if (buttonRef.current) buttonRef.current.innerHTML = locateButtonIcon(status);
  }, [status]);

  return null;
}

/** Live "you are here" pin: a locate button that requests geolocation (kept
 * live via watchPosition) and draws a marker + accuracy circle that follow
 * the user as they move. Purely position — no device orientation/compass
 * heading involved. */
function UserLocationLayer() {
  const map = useMap();
  const [status, setStatus] = useState<LocateStatus>("idle");
  const markerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const hasCenteredRef = useRef(false);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      markerRef.current?.remove();
      accuracyCircleRef.current?.remove();
    };
  }, []);

  function updatePosition(lat: number, lng: number, accuracy: number) {
    const latlng = L.latLng(lat, lng);
    if (!markerRef.current) {
      markerRef.current = L.marker(latlng, {
        icon: userLocationIcon(),
        zIndexOffset: 1000,
        interactive: false,
      }).addTo(map);
    } else {
      markerRef.current.setLatLng(latlng);
    }
    if (!accuracyCircleRef.current) {
      accuracyCircleRef.current = L.circle(latlng, {
        radius: accuracy,
        color: "#2563eb",
        weight: 1,
        fillColor: "#2563eb",
        fillOpacity: 0.1,
        interactive: false,
      }).addTo(map);
    } else {
      accuracyCircleRef.current.setLatLng(latlng);
      accuracyCircleRef.current.setRadius(accuracy);
    }
  }

  function startWatching() {
    setStatus("locating");
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setStatus("active");
        updatePosition(latitude, longitude, accuracy);
        if (!hasCenteredRef.current) {
          hasCenteredRef.current = true;
          map.flyTo([latitude, longitude], Math.max(map.getZoom(), 15));
        }
      },
      () => setStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
  }

  function handleClick() {
    if (!navigator.geolocation) {
      setStatus("denied");
      return;
    }
    if (status === "active" && markerRef.current) {
      map.flyTo(markerRef.current.getLatLng(), Math.max(map.getZoom(), 15));
      return;
    }
    startWatching();
  }

  return <LocateControl status={status} onClick={handleClick} />;
}

/** Notifies the parent (outside the react-leaflet tree) once the underlying
 * Leaflet map instance exists, so it can render UI that needs to call map
 * methods directly from ordinary React, outside Leaflet's own control
 * system — not currently used by anything, kept as reusable plumbing for
 * the next thing that needs it. */
function MapReadyBridge({ onReady }: { onReady?: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onReady?.(map);
  }, [map, onReady]);
  return null;
}

// Same breakpoint as Tailwind's `md` (and the rest of the app's mobile/desktop
// split, e.g. BottomNav) — below it, tapping a pin opens the bottom sheet
// instead of Leaflet's own popup (see ClusteredMarkers/EventClusteredMarkers).
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

/** Tapping the bare map (not a marker — Leaflet markers don't bubble their
 * clicks up to the map by default) dismisses the mobile bottom sheet, same
 * as tapping outside a Leaflet popup closes it on desktop. */
function SheetDismissBridge({ onDismiss }: { onDismiss?: () => void }) {
  useMapEvent("click", () => onDismiss?.());
  return null;
}

/** Keeps the world basemap always filling the screen, at any viewport size
 * or zoom level. `maxBounds` alone (set on MapContainer) stops the user
 * panning past the edge of the world, but a fixed `minZoom` can still leave
 * the *zoomed-out* world smaller than a big/ultrawide viewport — showing
 * blank background in a corner or strip regardless of panning. So this
 * recomputes, on every container resize, the lowest zoom at which the
 * world's rendered pixel size (256 * 2^zoom) still covers the container in
 * both dimensions, and pushes it up via setMinZoom (which also snaps the
 * current view up if it's now below that floor). */
function MinZoomGuard() {
  const map = useMap();

  useEffect(() => {
    function updateMinZoom() {
      map.invalidateSize();
      const { x, y } = map.getSize();
      const largestDimension = Math.max(x, y);
      if (largestDimension <= 0) return;
      const requiredZoom = Math.ceil(Math.log2(largestDimension / 256));
      map.setMinZoom(Math.max(requiredZoom, 0));
    }

    updateMinZoom();
    const observer = new ResizeObserver(updateMinZoom);
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

  return null;
}

/** Saves the current view (see readStoredView/writeStoredView above) every
 * time panning/zooming settles, so the next mount — typically the user
 * coming back from a place/event's full page — picks up right where they
 * left off instead of resetting to Lille. Debounced so a drag/pinch in
 * progress doesn't write on every intermediate frame. */
function ViewPersistenceBridge() {
  const map = useMap();

  useEffect(() => {
    let timeoutId: number | undefined;

    function persistNow() {
      const center = map.getCenter();
      writeStoredView({ lat: center.lat, lng: center.lng, zoom: map.getZoom() });
    }

    function schedulePersist() {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(persistNow, 200);
    }

    map.on("moveend", schedulePersist);
    map.on("zoomend", schedulePersist);

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      map.off("moveend", schedulePersist);
      map.off("zoomend", schedulePersist);
      // Final flush on unmount (e.g. navigating to a place's page) — covers
      // the case where the debounce above hasn't fired yet.
      try {
        persistNow();
      } catch {
        // Map may already be mid-teardown at this point; nothing to save.
      }
    };
  }, [map]);

  return null;
}

// Leaflet's bindPopup(string) injects the string as raw HTML with no
// escaping of its own — place.name/place.address are free text any signed-up
// user controls, so they must be entity-encoded before going anywhere near
// this template, or a malicious place name becomes stored XSS for every
// visitor who opens its popup on the public map.
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
// Leaflet's bindPopup, not JSX.
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
      label: eventDateFormatter.format(new Date(event.start_datetime)),
      bg: "#ede9fe",
      fg: EVENT_COLOR,
      icon: CALENDAR_ICON_SVG,
    },
    href: `/events/${event.id}`,
    cta: "Voir l'événement",
  });
}

export type MapFocusTarget = { id: string; lat: number; lng: number; zoom?: number };

// What the mobile bottom sheet (rendered by FullScreenMap, outside this
// component entirely) needs to show a preview — a place or an event marker
// was tapped. Exported so FullScreenMap/MapBottomSheet share the one shape.
export type MapSheetItem =
  | { kind: "place"; place: PlaceWithRelations }
  | { kind: "event"; event: EventWithPlace };

function ClusteredMarkers({
  places,
  focusTarget,
  isMobile,
  onSelectPlace,
  skipInitialFit,
}: {
  places: PlaceWithRelations[];
  focusTarget?: MapFocusTarget | null;
  isMobile: boolean;
  onSelectPlace?: (place: PlaceWithRelations) => void;
  /** True when the map mounted at a restored view (see readStoredView) —
   * fitting bounds to every place right after would immediately zoom back
   * out and defeat the whole point of restoring where the user left off.
   * Only suppresses the very first fit; a later filter change etc. still
   * fits normally, same as before. */
  skipInitialFit?: boolean;
}) {
  const map = useMap();
  const groupRef = useRef<L.MarkerClusterGroup | null>(null);
  // Plain object, not a JS `Map`, to avoid shadowing by this file's own
  // exported `Map` component.
  const markersByPlaceId = useRef<Record<string, L.Marker>>({});
  const isFirstFitRef = useRef(true);
  // Ref so the marker-creation effect doesn't need `onSelectPlace` itself in
  // its dependency array — FullScreenMap may pass a new function identity on
  // every render, and that alone shouldn't tear down/rebuild every marker.
  // Synced in its own effect (not during render) since mutating a ref while
  // rendering isn't safe under React's concurrent rendering.
  const onSelectPlaceRef = useRef(onSelectPlace);
  useEffect(() => {
    onSelectPlaceRef.current = onSelectPlace;
  });
  // Same idea, and for the same reason `isMobile` can't be a dependency of
  // the marker-creation effect below: `useIsMobileViewport` starts out
  // `false` and flips shortly after mount once matchMedia resolves, and
  // reacting to that flip by rebuilding every marker would also re-run
  // fitBounds — silently overwriting a just-restored view (see
  // readStoredView/skipInitialFit) with "zoomed out to fit everything"
  // milliseconds after mount. The click handler below reads this ref live,
  // at click time, so it's never actually stale despite not being a dep.
  const isMobileRef = useRef(isMobile);
  useEffect(() => {
    isMobileRef.current = isMobile;
  });

  useEffect(() => {
    const group = L.markerClusterGroup({
      iconCreateFunction: (cluster) => clusterIcon(cluster.getChildCount()),
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 50,
    });

    const markersById: Record<string, L.Marker> = {};
    places.forEach((place) => {
      const marker = L.marker([place.lat, place.lng], { icon: placeIcon });
      // Always bound; the sync effect further down immediately unbinds it
      // again if isMobile is (or becomes) true, without needing to recreate
      // markers/re-run fitBounds just because that flag changed.
      marker.bindPopup(popupHtml(place));
      marker.on("click", () => {
        if (isMobileRef.current) onSelectPlaceRef.current?.(place);
      });
      group.addLayer(marker);
      markersById[place.id] = marker;
    });

    map.addLayer(group);
    groupRef.current = group;
    markersByPlaceId.current = markersById;

    const isFirstFit = isFirstFitRef.current;
    if (places.length > 0 && !(isFirstFit && skipInitialFit)) {
      const bounds = L.latLngBounds(places.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
    // Only *commit* "no longer first" once this effect instance survives to
    // the next tick uncancelled. Dev-mode Strict Mode runs every effect as
    // mount → cleanup → mount, synchronously, before anything else gets a
    // chance to run — flipping the ref immediately (inside the setup body)
    // means that throwaway first pass "spends" the one skip, and the real,
    // kept pass right after it sees isFirstFit as already false and fits
    // bounds anyway, silently overwriting a just-restored view. Cancelling
    // this in cleanup means only a pass that *isn't* immediately torn down
    // — i.e. the real one — ever actually consumes it.
    const commitFirstFitTimer = isFirstFit ? window.setTimeout(() => {
      isFirstFitRef.current = false;
    }, 0) : undefined;

    return () => {
      if (commitFirstFitTimer !== undefined) window.clearTimeout(commitFirstFitTimer);
      map.removeLayer(group);
      groupRef.current = null;
    };
  }, [places, map, skipInitialFit]);

  // Keeps existing markers' popup binding in sync with isMobile without
  // recreating them (and *without* touching bounds/fitBounds above) — this
  // is what actually reacts to the viewport crossing the `md` breakpoint,
  // whether that's the matchMedia hook resolving shortly after mount or an
  // actual window resize later on.
  useEffect(() => {
    Object.entries(markersByPlaceId.current).forEach(([id, marker]) => {
      if (isMobile) {
        marker.unbindPopup();
        return;
      }
      const place = places.find((p) => p.id === id);
      if (place) marker.bindPopup(popupHtml(place));
    });
  }, [isMobile, places]);

  useEffect(() => {
    if (!focusTarget) return;

    const marker = markersByPlaceId.current[focusTarget.id];
    if (marker && groupRef.current) {
      // Zooms/pans just enough to pull the marker out of its cluster (if
      // any), then — mobile: opens the bottom sheet; desktop: its popup —
      // once it's actually visible on screen.
      groupRef.current.zoomToShowLayer(marker, () => {
        if (isMobile) {
          const place = places.find((p) => p.id === focusTarget.id);
          if (place) onSelectPlace?.(place);
        } else {
          marker.openPopup();
        }
      });
    } else {
      // No matching marker — either it's outside the current (possibly
      // tag-filtered) set, or this target is a city/area rather than a
      // venue. Still take the user to the right spot.
      map.flyTo([focusTarget.lat, focusTarget.lng], focusTarget.zoom ?? 16);
    }
  }, [focusTarget, map, isMobile, places, onSelectPlace]);

  return null;
}

function EventClusteredMarkers({
  events,
  focusTarget,
  isMobile,
  onSelectEvent,
}: {
  events: EventWithPlace[];
  focusTarget?: MapFocusTarget | null;
  isMobile: boolean;
  onSelectEvent?: (event: EventWithPlace) => void;
}) {
  const map = useMap();
  const groupRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersByEventId = useRef<Record<string, L.Marker>>({});
  // See ClusteredMarkers' onSelectPlaceRef for why this is a ref but
  // `isMobile` (below) is a plain effect dependency instead.
  const onSelectEventRef = useRef(onSelectEvent);
  useEffect(() => {
    onSelectEventRef.current = onSelectEvent;
  });

  useEffect(() => {
    const group = L.markerClusterGroup({
      iconCreateFunction: (cluster) => eventClusterIcon(cluster.getChildCount()),
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 50,
    });

    const markersById: Record<string, L.Marker> = {};
    events.forEach((event) => {
      const marker = L.marker([event.place.lat, event.place.lng], { icon: eventIcon });
      marker.on("click", () => {
        if (isMobile) onSelectEventRef.current?.(event);
      });
      if (!isMobile) marker.bindPopup(eventPopupHtml(event));
      group.addLayer(marker);
      markersById[event.id] = marker;
    });

    map.addLayer(group);
    groupRef.current = group;
    markersByEventId.current = markersById;

    return () => {
      map.removeLayer(group);
      groupRef.current = null;
    };
  }, [events, map, isMobile]);

  useEffect(() => {
    if (!focusTarget) return;
    const marker = markersByEventId.current[focusTarget.id];
    // Unlike ClusteredMarkers, no flyTo fallback here — the place layer
    // already owns that for any id it doesn't recognize either, so this
    // only ever needs to act when it actually has the matching marker.
    if (marker && groupRef.current) {
      groupRef.current.zoomToShowLayer(marker, () => {
        if (isMobile) {
          const event = events.find((e) => e.id === focusTarget.id);
          if (event) onSelectEvent?.(event);
        } else {
          marker.openPopup();
        }
      });
    }
  }, [focusTarget, isMobile, events, onSelectEvent]);

  return null;
}

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
  /** Called once the Leaflet map instance is ready, so a sibling component
   * (e.g. the compass overlaid outside the map) can read/set its bearing. */
  onMapReady?: (map: L.Map) => void;
  /** Below the `md` breakpoint, tapping a marker calls these instead of
   * opening Leaflet's own popup — FullScreenMap uses them to drive a mobile
   * bottom sheet. Above it, markers keep the regular popup and these are
   * never called. */
  onSelectPlace?: (place: PlaceWithRelations) => void;
  onSelectEvent?: (event: EventWithPlace) => void;
  /** Tapping the bare map dismisses the mobile bottom sheet, mirroring a
   * desktop popup closing on an outside click. */
  onDismissSelection?: () => void;
}) {
  const isMobile = useIsMobileViewport();
  // Lazy initializer: reads sessionStorage exactly once, before first paint,
  // so the map mounts already at the last place the user was looking at
  // instead of flashing Lille first. A later focusTarget (e.g. a city
  // picked from search) still flies in on top of this via its own effect,
  // same as before — this only changes the *starting point*, not that
  // behavior.
  const [initialView] = useState(() => readStoredView());
  const initialCenter: [number, number] = initialView ? [initialView.lat, initialView.lng] : LILLE_CENTER;

  return (
    <MapContainer
      center={initialCenter}
      zoom={initialView?.zoom ?? DEFAULT_ZOOM}
      scrollWheelZoom
      zoomControl={false}
      // Leaflet disables this by default on some (mostly older Android)
      // browsers as a legacy perf safeguard — there, markers freeze in place
      // for the whole pinch-zoom animation and only snap to their real spot
      // once it ends, which reads as the pins "detaching" mid-gesture.
      // Forcing it on keeps every marker locked to its real position the
      // entire time, on every device.
      markerZoomAnimation
      // Rotation (leaflet-rotate, a two-finger touch gesture) used to be
      // available here but was pulled out entirely — fiddly to use
      // accurately on a touchscreen and not worth the confusion it caused.
      // The map is always north-up now; there's no bearing to track.
      // Hard-stops panning at the edge of the world (see WORLD_BOUNDS) —
      // viscosity 1 means the edge is a wall, not a rubber-band you can
      // drag past. Combined with MinZoomGuard's dynamic minZoom, this is
      // what makes it impossible to ever pan/zoom into blank background,
      // and impossible to circle the globe and lose track of a pin that
      // only ever exists at its one real coordinate.
      maxBounds={WORLD_BOUNDS}
      maxBoundsViscosity={1.0}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url={CARTO_VOYAGER_URL}
        subdomains="abcd"
        maxZoom={20}
      />
      {/* Bottom-right so it never overlaps the search bar; hidden on mobile
          entirely (globals.css) since pinch-to-zoom already works there. */}
      <ZoomControl position="bottomright" />
      <ClusteredMarkers
        places={places}
        focusTarget={focusTarget}
        isMobile={isMobile}
        onSelectPlace={onSelectPlace}
        skipInitialFit={initialView !== null}
      />
      <EventClusteredMarkers
        events={events}
        focusTarget={focusTarget}
        isMobile={isMobile}
        onSelectEvent={onSelectEvent}
      />
      <UserLocationLayer />
      <MapReadyBridge onReady={onMapReady} />
      <MinZoomGuard />
      <ViewPersistenceBridge />
      {isMobile && <SheetDismissBridge onDismiss={onDismissSelection} />}
    </MapContainer>
  );
}
