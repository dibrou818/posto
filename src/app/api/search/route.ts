import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { nominatimSearch, addressPlaceName } from "@/lib/nominatim";

export type CitySearchResult = {
  label: string;
  subtitle: string | null;
  lat: number;
  lng: number;
  /** How close to fly in when this result is picked — cities want a wide
   * view of the whole town, a street address wants to land right on it.
   * Omitted for cities; FullScreenMap falls back to its own city zoom. */
  zoom?: number;
};

// Close enough to read individual street names/building outlines on the
// vector basemap without being so tight the pin ends up hidden under the
// search bar itself.
const ADDRESS_ZOOM = 17;

/** Searches French cities/towns/villages by name via OpenStreetMap's free
 * Nominatim geocoder. Never throws — a geocoding hiccup shouldn't break the
 * rest of the search. */
async function searchCities(query: string): Promise<CitySearchResult[]> {
  const data = await nominatimSearch({
    q: query,
    format: "json",
    featureType: "settlement",
    countrycodes: "fr",
    addressdetails: "1",
    limit: "4",
  });
  if (data === null) return [];

  const cities = data.map((item) => {
    const label = addressPlaceName(item.address) ?? item.display_name.split(",")[0];
    const subtitle = [item.address?.state, item.address?.country].filter(Boolean).join(", ") || null;
    return { label, subtitle, lat: parseFloat(item.lat), lng: parseFloat(item.lon) };
  });

  // Nominatim can return several entries for the same city (different OSM
  // relations at different admin levels) — keep the first (best-ranked) one.
  const seen = new Set<string>();
  return cities.filter((city) => {
    if (seen.has(city.label)) return false;
    seen.add(city.label);
    return true;
  });
}

/** Searches full street addresses (not just settlements) via Nominatim,
 * unrestricted beyond France — "3 boulevard de la Moselle", "rue Massena",
 * etc. Only keeps results Nominatim actually resolved to a road (filters
 * out the bare city/admin-area matches searchCities already covers, so the
 * two buckets don't just duplicate each other for an ambiguous query). */
async function searchAddresses(query: string): Promise<CitySearchResult[]> {
  const data = await nominatimSearch({
    q: query,
    format: "json",
    countrycodes: "fr",
    addressdetails: "1",
    limit: "5",
  });
  if (data === null) return [];

  return data
    .filter((item) => item.address?.road)
    .map((item) => {
      const { house_number, road, postcode } = item.address!;
      const label = house_number ? `${house_number} ${road}` : road!;
      const cityName = addressPlaceName(item.address);
      const subtitle = [postcode, cityName].filter(Boolean).join(" ") || null;
      return { label, subtitle, lat: parseFloat(item.lat), lng: parseFloat(item.lon), zoom: ADDRESS_ZOOM };
    });
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ tags: [], results: [], cities: [], addresses: [] });
  }

  // The home page's search (no map to jump to there) opts out of city/
  // address results with `?locations=0` — skipped here, not just hidden
  // client-side, so that search doesn't cost two Nominatim geocoding calls
  // per keystroke-debounced query for results it's never going to show.
  const includeLocations = request.nextUrl.searchParams.get("locations") !== "0";

  const supabase = await createClient();

  const [tagsRes, resultsRes, cities, addresses] = await Promise.all([
    supabase.rpc("search_tags", { search_query: q }),
    supabase.rpc("search_all", { search_query: q }),
    includeLocations ? searchCities(q) : Promise.resolve([]),
    includeLocations ? searchAddresses(q) : Promise.resolve([]),
  ]);

  if (tagsRes.error) {
    // Log the real Postgres/Supabase error server-side only — surfacing it
    // to the client would leak internal schema/function details.
    console.error("search_tags RPC failed:", tagsRes.error);
    return NextResponse.json({ error: "Une erreur est survenue, réessaie." }, { status: 500 });
  }
  if (resultsRes.error) {
    console.error("search_all RPC failed:", resultsRes.error);
    return NextResponse.json({ error: "Une erreur est survenue, réessaie." }, { status: 500 });
  }

  return NextResponse.json({
    tags: tagsRes.data ?? [],
    results: resultsRes.data ?? [],
    cities,
    addresses,
  });
}
