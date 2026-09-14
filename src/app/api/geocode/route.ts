import { NextResponse, type NextRequest } from "next/server";
import { nominatimSearch, addressPlaceName, addressSuburb } from "@/lib/nominatim";

/** Turns a free-text address into lat/lng via OpenStreetMap's free Nominatim
 * geocoder — used by the dashboard "Localiser" button so place owners never
 * have to look up GPS coordinates by hand. Also keeps the structured
 * city/postcode/suburb Nominatim already returns alongside the coordinates
 * (see PlaceForm) — stored for later, no browse-by-city/quartier UI reads
 * them yet. */
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address")?.trim() ?? "";

  if (address.length < 3) {
    return NextResponse.json({ error: "Adresse trop courte." }, { status: 400 });
  }

  const data = await nominatimSearch({
    q: address,
    format: "json",
    countrycodes: "fr",
    addressdetails: "1",
    limit: "1",
  });

  if (data === null) {
    return NextResponse.json({ error: "Géocodage indisponible, réessayez." }, { status: 502 });
  }
  if (data.length === 0) {
    return NextResponse.json({ error: "Adresse introuvable." }, { status: 404 });
  }

  const [match] = data;
  return NextResponse.json({
    lat: parseFloat(match.lat),
    lng: parseFloat(match.lon),
    label: match.display_name,
    city: addressPlaceName(match.address),
    postcode: match.address?.postcode ?? null,
    suburb: addressSuburb(match.address),
  });
}
