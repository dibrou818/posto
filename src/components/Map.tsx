"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet-rotate";
import type { PlaceWithRelations } from "@/lib/queries";
import { isOpenNow } from "@/lib/opening-hours";

const LILLE_CENTER: [number, number] = [50.6292, 3.0573];
const DEFAULT_ZOOM = 13;

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
 * Leaflet map instance exists, so it can render UI — like the compass — that
 * needs to call map methods (setBearing, etc.) from ordinary React, outside
 * Leaflet's own control system. */
function MapReadyBridge({ onReady }: { onReady?: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onReady?.(map);
  }, [map, onReady]);
  return null;
}

function popupHtml(place: PlaceWithRelations) {
  const open = isOpenNow(place.opening_hours);
  return `
    <div style="display:flex;flex-direction:column;gap:4px;">
      <span style="font-weight:600;">${place.name}</span>
      <span style="font-size:12px;color:#6b7280;">${place.address ?? ""}</span>
      <span style="font-size:12px;font-weight:500;">${open ? "🟢 Ouvert" : "🔴 Fermé"}</span>
      <a href="/places/${place.id}" style="font-size:12px;color:#2563eb;text-decoration:underline;">
        Voir la fiche
      </a>
    </div>
  `;
}

export type MapFocusTarget = { id: string; lat: number; lng: number; zoom?: number };

function ClusteredMarkers({
  places,
  focusTarget,
}: {
  places: PlaceWithRelations[];
  focusTarget?: MapFocusTarget | null;
}) {
  const map = useMap();
  const groupRef = useRef<L.MarkerClusterGroup | null>(null);
  // Plain object, not a JS `Map`, to avoid shadowing by this file's own
  // exported `Map` component.
  const markersByPlaceId = useRef<Record<string, L.Marker>>({});

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
      marker.bindPopup(popupHtml(place));
      group.addLayer(marker);
      markersById[place.id] = marker;
    });

    map.addLayer(group);
    groupRef.current = group;
    markersByPlaceId.current = markersById;

    if (places.length > 0) {
      const bounds = L.latLngBounds(places.map((p) => [p.lat, p.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }

    return () => {
      map.removeLayer(group);
      groupRef.current = null;
    };
  }, [places, map]);

  useEffect(() => {
    if (!focusTarget) return;

    const marker = markersByPlaceId.current[focusTarget.id];
    if (marker && groupRef.current) {
      // Zooms/pans just enough to pull the marker out of its cluster (if any),
      // then opens its popup once it's actually visible on screen.
      groupRef.current.zoomToShowLayer(marker, () => marker.openPopup());
    } else {
      // No matching marker — either it's outside the current (possibly
      // tag-filtered) set, or this target is a city/area rather than a
      // venue. Still take the user to the right spot.
      map.flyTo([focusTarget.lat, focusTarget.lng], focusTarget.zoom ?? 16);
    }
  }, [focusTarget, map]);

  return null;
}

export function Map({
  places,
  focusTarget,
  onMapReady,
}: {
  places: PlaceWithRelations[];
  focusTarget?: MapFocusTarget | null;
  /** Called once the Leaflet map instance is ready, so a sibling component
   * (e.g. the compass overlaid outside the map) can read/set its bearing. */
  onMapReady?: (map: L.Map) => void;
}) {
  return (
    <MapContainer
      center={LILLE_CENTER}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom
      zoomControl={false}
      // Leaflet disables this by default on some (mostly older Android)
      // browsers as a legacy perf safeguard — there, markers freeze in place
      // for the whole pinch-zoom animation and only snap to their real spot
      // once it ends, which reads as the pins "detaching" mid-gesture.
      // Forcing it on keeps every marker locked to its real position the
      // entire time, on every device.
      markerZoomAnimation
      // leaflet-rotate: lets the map be spun freely with a two-finger touch
      // gesture (no device sensors/permissions involved, purely manual).
      // rotateControl is off because the compass overlay (outside the map,
      // see FullScreenMap) is our own UI for the same job.
      rotate
      touchRotate
      shiftKeyRotate={false}
      rotateControl={false}
      bearing={0}
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
      <ClusteredMarkers places={places} focusTarget={focusTarget} />
      <UserLocationLayer />
      <MapReadyBridge onReady={onMapReady} />
    </MapContainer>
  );
}
