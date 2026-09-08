"use client";

import { useEffect, useState } from "react";
import type L from "leaflet";

/** Animates the map's bearing back to 0 (north-up) along the shortest
 * rotational path — e.g. from 350° it turns forward through 360/0, not
 * backwards through 180 — so the snap always feels natural, never like it's
 * unwinding the "wrong way". */
function resetBearingSmoothly(map: L.Map, duration = 450) {
  const start = map.getBearing();
  const delta = ((0 - start + 540) % 360) - 180; // shortest signed delta, in (-180, 180]
  if (Math.abs(delta) < 0.5) {
    map.setBearing(0);
    return;
  }

  const startTime = performance.now();
  function step(now: number) {
    const t = Math.min((now - startTime) / duration, 1);
    const eased = 1 - (1 - t) ** 3; // ease-out cubic
    map.setBearing(start + delta * eased);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/** Minimalist compass shown over the map: its dial rotates live with the
 * map's bearing (set by the two-finger rotate gesture — see Map.tsx) so N/E/
 * S/O always show where those directions currently are on screen, and
 * tapping it smoothly re-centers the map back to north-up. Purely visual —
 * no device sensors or extra permissions involved. */
export function MapCompass({ map }: { map: L.Map | null }) {
  const [bearing, setBearingState] = useState(0);

  useEffect(() => {
    if (!map) return;
    const sync = () => setBearingState(map.getBearing());
    sync();
    map.on("rotate", sync);
    return () => {
      map.off("rotate", sync);
    };
  }, [map]);

  if (!map) return null;

  const isNorthUp = Math.abs(bearing) < 0.5;

  return (
    <button
      type="button"
      onClick={() => resetBearingSmoothly(map)}
      disabled={isNorthUp}
      aria-label="Réorienter la carte vers le nord"
      title="Réorienter au nord"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white/95 shadow-md backdrop-blur transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/30 disabled:cursor-default"
    >
      <svg viewBox="0 0 40 40" width="28" height="28" className="pointer-events-none">
        {/* The whole dial (labels + needle) turns with the map bearing, like
            a real compass face — only the round button frame stays fixed. */}
        <g style={{ transform: `rotate(${bearing}deg)`, transformOrigin: "20px 20px" }}>
          <text x="20" y="9.5" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#dc2626">
            N
          </text>
          <text x="33.5" y="23" textAnchor="middle" fontSize="6.5" fontWeight="600" fill="#6b7280">
            E
          </text>
          <text x="20" y="37.5" textAnchor="middle" fontSize="6.5" fontWeight="600" fill="#6b7280">
            S
          </text>
          <text x="6.5" y="23" textAnchor="middle" fontSize="6.5" fontWeight="600" fill="#6b7280">
            O
          </text>
          <polygon points="20,13 23.2,20 20,18.3 16.8,20" fill="#dc2626" />
          <polygon points="20,27 23.2,20 20,21.7 16.8,20" fill="#9ca3af" />
        </g>
      </svg>
    </button>
  );
}
