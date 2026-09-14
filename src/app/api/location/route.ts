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

type WeatherData = { temperatureC: number | null; weatherCode: number | null; isDay: boolean };

/** Current temperature + WMO weather code + day/night via Open-Meteo — free,
 * no API key required. weatherCode/isDay are what LocationWeather uses to
 * pick a sun/moon/cloud/rain/etc icon on the homepage — see
 * lib/weatherIcon.ts for the code -> icon mapping. */
async function fetchWeather(lat: number, lng: number): Promise<WeatherData> {
  const empty: WeatherData = { temperatureC: null, weatherCode: null, isDay: true };
  const url =
    "https://api.open-meteo.com/v1/forecast?" +
    new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      current: "temperature_2m,weather_code,is_day",
    });

  try {
    const res = await fetch(url);
    if (!res.ok) return empty;
    const data = (await res.json()) as {
      current?: { temperature_2m?: number; weather_code?: number; is_day?: number };
    };
    return {
      temperatureC: data.current?.temperature_2m ?? null,
      weatherCode: data.current?.weather_code ?? null,
      // Open-Meteo sends 1/0, not a boolean — default to day (1) rather
      // than assuming night if this field is ever missing.
      isDay: data.current?.is_day !== 0,
    };
  } catch {
    return empty;
  }
}

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: "lat et lng requis" }, { status: 400 });
  }

  const [city, weather] = await Promise.all([
    reverseGeocodeCity(lat, lng),
    fetchWeather(lat, lng),
  ]);

  return NextResponse.json({ city, ...weather });
}
