import * as maplibregl from "maplibre-gl";
import { writeUserLocation } from "@/lib/userLocationStore";

// Split out of Map.tsx (which was pushing 1000+ lines) — self-contained:
// this only ever touches the `map` instance handed to it and its own
// internal state, nothing from the rest of Map.tsx's mount effect. Same
// behavior, just its own file.

type LocateStatus = "idle" | "locating" | "active" | "denied";

// How close a "recenter on me" (button click, or an auto-started live fix —
// see setupUserLocationLayer's `seed` param) zooms in. Wide enough to still
// see the surrounding streets/venues at a glance, not so tight it reads as
// dropped into one single block.
export const LOCATE_ZOOM = 13;

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
    // styling with a neighbor to preserve. margin-bottom overrides the
    // library's own ~10px default (an inline style here always wins over
    // its stylesheet rule, same element) — a few more px so the button
    // doesn't read as glued to the very bottom edge of the map.
    container.style.cssText = "border-radius:9999px;overflow:hidden;margin-bottom:20px;";
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
 * a cleanup function.
 *
 * `seed`, when given, is a location already known from elsewhere in the app
 * this session (see userLocationStore.ts — typically granted on the home
 * page) — the dot is drawn there immediately on mount, before any
 * geolocation call, and the camera is treated as already centered (Map.tsx
 * sets the map's *initial* center to the same seed, so there's nothing left
 * to fly to). When the seed came from real browser geolocation rather than
 * the IP fallback (`approximate: false`), live tracking also starts right
 * away — permission is already granted in that case, so this resolves
 * silently, no fresh prompt. An approximate (IP-based) seed never
 * auto-starts real geolocation on its own; the dot just stays put until the
 * visitor taps the button themselves. */
export function setupUserLocationLayer(
  map: maplibregl.Map,
  seed?: { lat: number; lng: number; approximate: boolean } | null,
): () => void {
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
        // Shared with every other page that can locate the visitor (see
        // userLocationStore.ts) — a real GPS/Wi-Fi fix always overwrites
        // whatever was there before (even an earlier approximate one),
        // city left as-is since this layer has no reverse-geocode of its
        // own; the next page that reads this re-resolves the city itself.
        writeUserLocation({ lat: latitude, lng: longitude, city: null, approximate: false });
        if (!hasCentered) {
          hasCentered = true;
          map.flyTo({ center: [longitude, latitude], zoom: Math.max(map.getZoom(), LOCATE_ZOOM) });
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
      map.flyTo({ center: marker.getLngLat(), zoom: Math.max(map.getZoom(), LOCATE_ZOOM) });
      return;
    }
    startWatching();
  });

  map.on("zoom", updateAccuracyCircleRadius);

  if (seed) {
    // Draw the dot immediately — Map.tsx already opened the camera centered
    // here (see its own initialCenter), so there's no fly-to needed.
    hasCentered = true;
    control.setStatus("active");
    updatePosition(seed.lat, seed.lng, 0);
    // Real geolocation, not the IP fallback: permission is already granted
    // from wherever this seed came from, so this resolves silently — no
    // fresh prompt — and upgrades the static seed into a live, accurate dot.
    if (!seed.approximate && navigator.geolocation) startWatching();
  }

  return () => {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    marker?.remove();
    map.off("zoom", updateAccuracyCircleRadius);
  };
}
