"use client";

// Shared across every page that can obtain the visitor's location —
// LocationWeather (home) and the map's own "locate me" control
// (mapUserLocation.ts) both read AND write this, so granting location once
// anywhere in the app carries over everywhere else: locate yourself on the
// map, the home page shows you as already located next visit; locate
// yourself on the home page, the map opens already centered on you with
// its live dot, no second click needed.
//
// sessionStorage, not localStorage — same reasoning as Map.tsx's own
// posto:map-view: this should survive navigating back and forth within one
// visit, not silently resurface a location from three days ago.

export type StoredUserLocation = {
  lat: number;
  lng: number;
  /** Null when a city name hasn't resolved yet, or never did (a failed
   * reverse-geocode) — callers already handle a null city (see
   * LocationWeather's own fallbackCity). */
  city: string | null;
  /** True when this came from the IP-based fallback (see ipGeolocation.ts)
   * rather than the browser's real geolocation — city-level accuracy at
   * best. Consumers use this to decide whether it's safe to silently start
   * live tracking (see mapUserLocation.ts): browser permission is only
   * actually granted when this is false. */
  approximate: boolean;
};

const STORAGE_KEY = "posto:user-location";

export function readUserLocation(): StoredUserLocation | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.lat !== "number" || typeof parsed?.lng !== "number") return null;
    return {
      lat: parsed.lat,
      lng: parsed.lng,
      city: typeof parsed.city === "string" ? parsed.city : null,
      approximate: parsed.approximate === true,
    };
  } catch {
    // Private browsing, storage disabled, corrupted value, etc. — falling
    // back to "nothing stored" is fine, this is a nicety, not a dependency.
    return null;
  }
}

export function writeUserLocation(location: StoredUserLocation) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch {
    // ignore — see readUserLocation
  }
}
