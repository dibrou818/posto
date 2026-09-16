"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import { applyFrenchLabels, applyCleanTheme, simplifyAttribution } from "@/lib/mapTheme";

// Same Turbopack worker-url fix as Map.tsx (see its own comment for the
// full explanation) — needed independently here since this file, loaded
// via a separate dynamic import (see LocationMiniMap.tsx), never runs
// through Map.tsx's own module-scope call.
maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

// Same vector style as the full map (Map.tsx's STYLE_URL) — this is meant
// to read as "the same map, just a small window into it", not a visually
// distinct mini-map product.
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

// Close enough to see the surrounding block/street at a glance without the
// single point reading as lost in a wide, empty view — a static "here it
// is", not something meant to be explored.
const MINI_MAP_ZOOM = 15;

/** A small, self-contained map showing exactly one point — the place page
 * shows its own place, the event page shows its place too (an event has no
 * location of its own beyond its venue's). Deliberately not the full
 * clustering/popup/search Map component: there's only ever one pin here,
 * so none of that machinery has anything to do. Same zoom controls as the
 * full map (scroll wheel, pinch, the +/- buttons, double-click) — via
 * `cooperativeGestures` rather than plain scrollZoom, so a page full of
 * these doesn't hijack normal page scroll the moment the pointer crosses
 * one while scrolling past: a bare scroll still scrolls the page, and the
 * map shows a brief "Ctrl + molette pour zoomer" hint instead of zooming,
 * exactly like Google's own map embeds handle the same problem. Two-finger
 * touch still pans/zooms the map directly — only single-finger scroll (i.e.
 * normal page scrolling) is deferred to the page. */
export function LocationMiniMapCanvas({ lat, lng, color }: { lat: number; lng: number; color: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [lng, lat],
      zoom: MINI_MAP_ZOOM,
      attributionControl: false,
      // No rotation/pitch controls on a map this small — a tilted preview
      // reads as broken, not deliberate (same reasoning as the full Map).
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      // This version of maplibre-gl only takes a boolean here (no custom
      // help-text object like some other versions/forks support) — the
      // brief on-hover hint it shows is MapLibre's own default English
      // text, not something this app controls.
      cooperativeGestures: true,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    // Same corner, same compact form, same single-credit text as the full
    // map (Map.tsx) — see lib/mapTheme.ts's simplifyAttribution, called
    // below once the style has actually loaded.
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");

    map.on("load", () => {
      applyFrenchLabels(map);
      applyCleanTheme(map);
      simplifyAttribution(map);
    });

    // Same ring+core look as the full map's unclustered pins (see Map.tsx's
    // UNCLUSTERED_RING_RADIUS/CORE_RADIUS and their paint) — reproduced as a
    // plain DOM marker rather than a GeoJSON circle layer, since a single
    // static point doesn't need a whole source/layer pair just to draw one
    // dot.
    const el = document.createElement("div");
    el.style.cssText = "position:relative;width:30px;height:30px;";
    el.innerHTML = `
      <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.16;filter:blur(4px);"></div>
      <div style="position:absolute;top:5px;left:5px;width:20px;height:20px;border-radius:50%;background:${color};border:2px solid #ffffff;box-shadow:0 1px 4px rgba(0,0,0,0.35);"></div>
    `;
    const marker = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([lng, lat]).addTo(map);

    return () => {
      marker.remove();
      map.remove();
    };
  }, [lat, lng, color]);

  return <div ref={containerRef} className="h-52 w-full" />;
}
