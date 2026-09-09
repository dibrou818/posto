import { NextResponse, type NextRequest } from "next/server";

type NominatimItem = { lat: string; lon: string; display_name: string };

/** Turns a free-text address into lat/lng via OpenStreetMap's free Nominatim
 * geocoder — used by the dashboard "Localiser" button so place owners never
 * have to look up GPS coordinates by hand. */
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address")?.trim() ?? "";

  if (address.length < 3) {
    return NextResponse.json({ error: "Adresse trop courte." }, { status: 400 });
  }

  const url =
    "https://nominatim.openstreetmap.org/search?" +
    new URLSearchParams({
      q: address,
      format: "json",
      countrycodes: "fr",
      addressdetails: "0",
      limit: "1",
    });

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Posto/1.0 (+https://github.com/dibrou818/posto)",
      },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Géocodage indisponible, réessayez." }, { status: 502 });
    }

    const data = (await res.json()) as NominatimItem[];
    if (data.length === 0) {
      return NextResponse.json({ error: "Adresse introuvable." }, { status: 404 });
    }

    const [match] = data;
    return NextResponse.json({
      lat: parseFloat(match.lat),
      lng: parseFloat(match.lon),
      label: match.display_name,
    });
  } catch {
    return NextResponse.json({ error: "Géocodage indisponible, réessayez." }, { status: 502 });
  }
}
