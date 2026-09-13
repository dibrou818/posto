// Shared low-level client for OpenStreetMap's free Nominatim geocoder —
// used by api/geocode (address -> lat/lng), api/search (city autocomplete),
// and api/location (lat/lng -> city name). All three used to build this URL
// and set this header independently; consolidated here so there's one place
// that knows how to talk to Nominatim.
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
// Required by Nominatim's usage policy: identify the application.
const NOMINATIM_USER_AGENT = "Posto/1.0 (+https://github.com/dibrou818/posto)";

export type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
  country?: string;
};

export type NominatimSearchResult = {
  display_name: string;
  lat: string;
  lon: string;
  address?: NominatimAddress;
};

export type NominatimReverseResult = {
  address?: NominatimAddress;
};

async function fetchNominatim<T>(path: "search" | "reverse", params: Record<string, string>): Promise<T | null> {
  const url = `${NOMINATIM_BASE_URL}/${path}?${new URLSearchParams(params)}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": NOMINATIM_USER_AGENT } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Forward geocoding (address/city name -> candidates). Returns null on any
 * network/HTTP failure — never throws — so callers decide their own
 * fallback/error message. */
export function nominatimSearch(params: Record<string, string>): Promise<NominatimSearchResult[] | null> {
  return fetchNominatim<NominatimSearchResult[]>("search", params);
}

/** Reverse geocoding (lat/lng -> address). Same never-throws contract as
 * {@link nominatimSearch}. */
export function nominatimReverse(params: Record<string, string>): Promise<NominatimReverseResult | null> {
  return fetchNominatim<NominatimReverseResult>("reverse", params);
}

/** Picks the best human-readable place name off a Nominatim address block —
 * whichever of city/town/village/municipality is actually populated, in
 * that preference order. Shared by the city-search and reverse-geocode
 * routes, which both need exactly this. */
export function addressPlaceName(address: NominatimAddress | undefined): string | null {
  if (!address) return null;
  return address.city ?? address.town ?? address.village ?? address.municipality ?? null;
}
