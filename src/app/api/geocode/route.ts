import { NextResponse, type NextRequest } from "next/server";
import { nominatimSearch, addressPlaceName, addressSuburb, type NominatimAddress } from "@/lib/nominatim";

export type AddressSuggestion = {
  /** What the owner sees and what gets saved as the place's address. */
  label: string;
  lat: number;
  lng: number;
  city: string | null;
  postcode: string | null;
  suburb: string | null;
};

function formatAddress(address: NominatimAddress | undefined, fallback: string): string {
  const street = [address?.house_number, address?.road].filter(Boolean).join(" ");
  const town = [address?.postcode, addressPlaceName(address)].filter(Boolean).join(" ");
  const label = [street, town].filter(Boolean).join(", ");
  return label || fallback;
}

/** Address autocomplete for the dashboard's place form: turns what an owner
 * types into a short list of real addresses (OpenStreetMap's free Nominatim
 * geocoder) to pick from. The coordinates, city, postcode and quartier come
 * back with each suggestion and are saved with the place without ever being
 * shown or edited by hand — nobody should have to know their GPS position. */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (query.length < 3) {
    return NextResponse.json({ results: [] satisfies AddressSuggestion[] });
  }

  const data = await nominatimSearch({
    q: query,
    format: "json",
    countrycodes: "fr",
    addressdetails: "1",
    dedupe: "1",
    limit: "6",
  });

  if (data === null) {
    return NextResponse.json({ error: "Recherche d'adresse indisponible, réessayez." }, { status: 502 });
  }

  const seen = new Set<string>();
  const results: AddressSuggestion[] = [];
  for (const match of data) {
    const label = formatAddress(match.address, match.display_name.split(",").slice(0, 3).join(","));
    if (seen.has(label)) continue;
    seen.add(label);
    results.push({
      label,
      lat: parseFloat(match.lat),
      lng: parseFloat(match.lon),
      city: addressPlaceName(match.address),
      postcode: match.address?.postcode ?? null,
      suburb: addressSuburb(match.address),
    });
  }

  return NextResponse.json({ results });
}
