import { NextResponse, type NextRequest } from "next/server";
import { nominatimReverse, addressPlaceName } from "@/lib/nominatim";

/** Resolves a lat/lng to a city name via OpenStreetMap's free Nominatim
 * reverse geocoder. Never throws — a hiccup here shouldn't break the rest. */
async function reverseGeocodeCity(lat: number, lng: number): Promise<string | null> {
  const data = await nominatimReverse({
    format: "json",
    lat: String(lat),
    lon: String(lng),
    addressdetails: "1",
    zoom: "10",
  });
  return addressPlaceName(data?.address);
}

/** Current temperature via Open-Meteo — free, no API key required. */
async function fetchTemperature(lat: number, lng: number): Promise<number | null> {
  const url =
    "https://api.open-meteo.com/v1/forecast?" +
    new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      current: "temperature_2m",
    });

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { current?: { temperature_2m?: number } };
    return data.current?.temperature_2m ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: "lat et lng requis" }, { status: 400 });
  }

  const [city, temperatureC] = await Promise.all([
    reverseGeocodeCity(lat, lng),
    fetchTemperature(lat, lng),
  ]);

  return NextResponse.json({ city, temperatureC });
}
