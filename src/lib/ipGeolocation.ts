export type IpLocation = {
  lat: number;
  lng: number;
  city: string | null;
};

// Free, HTTPS, no API key — unlike ip-api.com (HTTP-only, a mixed-content
// dead end on an HTTPS site like this one), ipwho.is works straight from
// the browser and has a generous enough daily allowance for a small app.
const IPWHO_ENDPOINT = "https://ipwho.is/";

/** Approximates the visitor's location from their IP address — city-level
 * accuracy at best, nowhere near GPS precision, but it's the difference
 * between "denied location = dead end" and "denied location = still gets a
 * reasonable default". Only ever called after the browser's own
 * geolocation has already failed (see LocationWeather) — never a silent
 * replacement for it. Never throws: any failure here (network hiccup,
 * ipwho.is down, request blocked by an ad-blocker) just means no fallback,
 * exactly the dead end that existed before this. */
export async function fetchIpLocation(): Promise<IpLocation | null> {
  try {
    const res = await fetch(IPWHO_ENDPOINT);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success || typeof data.latitude !== "number" || typeof data.longitude !== "number") {
      return null;
    }
    return {
      lat: data.latitude,
      lng: data.longitude,
      city: typeof data.city === "string" ? data.city : null,
    };
  } catch {
    return null;
  }
}
