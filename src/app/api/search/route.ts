import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type CitySearchResult = {
  label: string;
  subtitle: string | null;
  lat: number;
  lng: number;
};

type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
  country?: string;
};

type NominatimItem = {
  display_name: string;
  lat: string;
  lon: string;
  address?: NominatimAddress;
};

/** Searches French cities/towns/villages by name via OpenStreetMap's free
 * Nominatim geocoder. Never throws — a geocoding hiccup shouldn't break the
 * rest of the search. */
async function searchCities(query: string): Promise<CitySearchResult[]> {
  const url =
    "https://nominatim.openstreetmap.org/search?" +
    new URLSearchParams({
      q: query,
      format: "json",
      featureType: "settlement",
      countrycodes: "fr",
      addressdetails: "1",
      limit: "4",
    });

  try {
    const res = await fetch(url, {
      headers: {
        // Required by Nominatim's usage policy: identify the application.
        "User-Agent": "Posto/1.0 (+https://github.com/dibrou818/posto)",
      },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as NominatimItem[];
    const cities = data.map((item) => {
      const address = item.address ?? {};
      const label =
        address.city ?? address.town ?? address.village ?? address.municipality ?? item.display_name.split(",")[0];
      const subtitle = [address.state, address.country].filter(Boolean).join(", ") || null;
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
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ tags: [], results: [], cities: [] });
  }

  const supabase = await createClient();

  const [tagsRes, resultsRes, cities] = await Promise.all([
    supabase.rpc("search_tags", { search_query: q }),
    supabase.rpc("search_all", { search_query: q }),
    searchCities(q),
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
  });
}
