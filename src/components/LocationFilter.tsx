"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CityResult } from "@/components/SearchBar";

export type LocationFilterValue = { label: string; lat: number; lng: number };

export const LOCATION_FILTER_RADIUS_KM = 30;
const RADIUS_KM = LOCATION_FILTER_RADIUS_KM;

// Keeps the dropdown fully inside the viewport regardless of where the chip
// sits on screen — clipping it with overflow-hidden would just cut it off
// instead of actually fixing anything.
const VIEWPORT_MARGIN = 12;
const DROPDOWN_MAX_WIDTH = 256;

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-6.5-7-11.5a7 7 0 0 1 14 0C19 14.5 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.2" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 7.5 10 12.5 15 7.5" />
    </svg>
  );
}

/** City chip next to the search bar: shows the located city (once
 * geolocation resolves — see HomeExplorer) with a ~30 km radius applied to
 * the browse grid, and lets the user pick any other French city by hand,
 * overriding whatever geolocation found. */
export function LocationFilter({
  value,
  onChange,
}: {
  value: LocationFilterValue | null;
  onChange: (value: LocationFilterValue | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cities, setCities] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const queryTooShort = query.trim().length < 2;

  useEffect(() => {
    if (queryTooShort) return;

    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setCities(data.cities ?? []);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query, queryTooShort]);

  // Stale results from a previous longer query shouldn't linger once the
  // query is cleared back down, so gate on length instead of resetting state.
  const visibleCities = queryTooShort ? [] : cities;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Measures the chip's actual on-screen position and clamps the dropdown
  // (rendered `fixed`, so it isn't clipped by any scrolling/overflow
  // ancestor) so it always stays within the viewport horizontally — a real
  // reposition, not just a CSS max-width clip, since the chip can end up
  // anywhere in its row depending on screen width and what's next to it.
  useLayoutEffect(() => {
    if (!open) return;

    function reposition() {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const width = Math.min(DROPDOWN_MAX_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
      const left = Math.min(
        Math.max(rect.left, VIEWPORT_MARGIN),
        window.innerWidth - width - VIEWPORT_MARGIN,
      );
      setDropdownPos({ top: rect.bottom + 4, left, width });
    }

    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  function pick(city: CityResult) {
    onChange({ label: city.label, lat: city.lat, lng: city.lng });
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative min-w-0">
      <div className="flex min-w-0 items-center gap-1 rounded-lg border border-gray-300 bg-white pr-1 text-xs">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 items-center gap-1.5 rounded-l-lg px-3 py-1.5 font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
        >
          <PinIcon />
          <span className="min-w-0 max-w-[7rem] truncate sm:max-w-[9rem]">
            {value ? `${value.label} · ${RADIUS_KM} km` : "Choisir une ville"}
          </span>
          <ChevronIcon />
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Réinitialiser le filtre de ville"
            title="Réinitialiser"
            className="shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
          >
            ✕
          </button>
        )}
      </div>

      {open && dropdownPos && (
        <div
          className="fixed z-50 rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
          style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
        >
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une ville..."
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 transition-colors focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
          <div className="mt-1 max-h-56 overflow-y-auto">
            {loading && <p className="px-2 py-2 text-xs text-gray-500">Recherche...</p>}
            {!loading && !queryTooShort && visibleCities.length === 0 && (
              <p className="px-2 py-2 text-xs text-gray-500">Aucune ville trouvée.</p>
            )}
            {visibleCities.map((city) => (
              <button
                key={`${city.label}-${city.lat}`}
                type="button"
                onClick={() => pick(city)}
                className="flex w-full min-w-0 flex-col items-start rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-gray-50 focus:outline-none focus-visible:bg-gray-50"
              >
                <span className="w-full truncate text-gray-900">{city.label}</span>
                {city.subtitle && (
                  <span className="w-full truncate text-xs text-gray-500">{city.subtitle}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
