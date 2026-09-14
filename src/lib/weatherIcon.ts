// Maps Open-Meteo's WMO weather codes (https://open-meteo.com/en/docs, the
// "WMO Weather interpretation codes" table) down to the small icon set
// LocationWeather actually needs — nobody reading a homepage banner needs
// to distinguish "slight drizzle" from "moderate drizzle", just roughly
// what's happening outside.
export type WeatherKind = "clear" | "cloudy" | "fog" | "rain" | "snow" | "storm";

export function weatherKind(code: number | null): WeatherKind {
  if (code === null) return "clear";
  if (code === 0 || code === 1) return "clear";
  if (code === 2 || code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "cloudy";
}
