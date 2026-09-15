"use client";

import { useState, type ReactNode } from "react";
import type { UserLocation } from "@/lib/usePlacesExplorer";
import { weatherKind } from "@/lib/weatherIcon";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "denied" }
  | { status: "granted"; city: string; temperatureC: number | null; weatherCode: number | null; isDay: boolean };

function LocationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21s-7-6.5-7-11.5a7 7 0 0 1 14 0C19 14.5 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.2" />
    </svg>
  );
}

// Small, classic weather-icon set — one per WeatherKind, plus the day/night
// split for "clear" (the one condition where that distinction actually
// changes the icon people expect to see).
function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 18.5a4.5 4.5 0 0 1-.5-8.97 5.5 5.5 0 0 1 10.66-1.9A4 4 0 0 1 17 18.5H7Z" />
    </svg>
  );
}

function FogIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9.5h11M4 13.5h16M4 17.5h13" />
    </svg>
  );
}

function RainIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 15a4.5 4.5 0 0 1-.5-8.97 5.5 5.5 0 0 1 10.66-1.9A4 4 0 0 1 17 15H7Z" />
      <path d="M8 18.5 7 20.5M12 18.5l-1 2M16 18.5l-1 2" />
    </svg>
  );
}

function SnowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 15a4.5 4.5 0 0 1-.5-8.97 5.5 5.5 0 0 1 10.66-1.9A4 4 0 0 1 17 15H7Z" />
      <path d="M8 18v3M12 18v3M16 18v3M6.7 19.5 9.3 18M17.3 19.5 14.7 18" />
    </svg>
  );
}

function StormIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 14.5a4.5 4.5 0 0 1-.5-8.97 5.5 5.5 0 0 1 10.66-1.9A4 4 0 0 1 17 14.5H7Z" />
      <path d="m13 15-2.5 4h3L11 23" />
    </svg>
  );
}

/** Picks the small weather icon matching a WMO code + day/night — "clear"
 * is the only condition where that split actually changes which icon
 * people expect (sun vs. moon); every other condition looks the same
 * whatever the hour. */
function WeatherIcon({ code, isDay }: { code: number | null; isDay: boolean }) {
  const kind = weatherKind(code);
  if (kind === "clear") return isDay ? <SunIcon /> : <MoonIcon />;
  if (kind === "cloudy") return <CloudIcon />;
  if (kind === "fog") return <FogIcon />;
  if (kind === "rain") return <RainIcon />;
  if (kind === "snow") return <SnowIcon />;
  return <StormIcon />;
}

/** Full-width hero banner at the top of the homepage: the user's located
 * city centered front and center, current temperature + a matching weather
 * icon tucked small in the bottom-right corner, and `children` (the search
 * bar) rendered inside it — one cohesive "here's where you are, here's how
 * to look elsewhere" block instead of a plain click-to-locate row sitting
 * above an unrelated search bar. Before location is granted, the same
 * banner shows a centered call-to-action instead of a city name; the search
 * bar stays usable either way. */
export function LocationWeather({
  onLocated,
  onCityResolved,
  children,
}: {
  onLocated: (loc: UserLocation) => void;
  /** Fired once the city name resolves (or fails to), bundled with the same
   * coords — a separate callback rather than reusing `onLocated` so callers
   * needing the city (e.g. auto-filling a location filter) never have to
   * read back a possibly-stale `userLocation` from their own state. */
  onCityResolved?: (city: string | null, loc: UserLocation) => void;
  /** The search bar, rendered inside the banner below the city/prompt. */
  children?: ReactNode;
}) {
  const [state, setState] = useState<State>({ status: "idle" });

  function requestLocation() {
    if (!navigator.geolocation) {
      setState({ status: "denied" });
      return;
    }

    setState({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location: UserLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        onLocated(location);

        try {
          const res = await fetch(`/api/location?lat=${location.lat}&lng=${location.lng}`);
          const data = await res.json();
          const city = typeof data.city === "string" ? data.city : null;
          onCityResolved?.(city, location);
          setState({
            status: "granted",
            city: city ?? "Votre position",
            temperatureC: typeof data.temperatureC === "number" ? data.temperatureC : null,
            weatherCode: typeof data.weatherCode === "number" ? data.weatherCode : null,
            isDay: data.isDay !== false,
          });
        } catch {
          onCityResolved?.(null, location);
          setState({ status: "granted", city: "Votre position", temperatureC: null, weatherCode: null, isDay: true });
        }
      },
      () => setState({ status: "denied" }),
      { timeout: 8000 },
    );
  }

  const label =
    state.status === "loading"
      ? "Localisation en cours..."
      : state.status === "denied"
        ? "Localisation refusée — cliquez pour réessayer"
        : "Cliquer pour activer la localisation";

  return (
    // No overflow-hidden here: this hero has nothing decorative overflowing
    // its own bounds, but it does contain the search bar's results dropdown
    // (via `children`), which is taller than the hero itself once open —
    // overflow-hidden would clip it exactly at the hero's bottom edge
    // instead of letting it float over the page content below, the way an
    // absolutely-positioned dropdown is supposed to.
    <div
      className="relative w-full bg-gray-900 bg-cover bg-center px-4 pt-10 pb-12 sm:px-6 sm:pt-14 sm:pb-16"
      // A dark scrim baked into the same background-image (not a separate
      // overlay element) — same trick as the event poster generator's own
      // gradient-over-photo, here as a flat wash rather than a bottom-up
      // gradient since the whole banner (not just its lower half) needs to
      // stay readable: the city name/button/search bar sit centered, not
      // pinned to the bottom.
      style={{ backgroundImage: "linear-gradient(rgba(17,24,39,0.6), rgba(17,24,39,0.72)), url('/hero-photo.png')" }}
    >
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-5">
        {state.status === "granted" ? (
          <div className="text-center">
            <p className="text-xs font-medium tracking-wide text-white/60 uppercase">Votre position</p>
            <p className="mt-1 text-3xl font-bold text-white sm:text-4xl">{state.city}</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={requestLocation}
            disabled={state.status === "loading"}
            className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-white/90 transition-colors hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:opacity-60"
          >
            <LocationIcon />
            <span className="text-sm font-medium">{label}</span>
          </button>
        )}

        {children && <div className="w-full">{children}</div>}
      </div>

      {state.status === "granted" && state.temperatureC !== null && (
        <div className="absolute right-4 bottom-3 flex items-center gap-1.5 text-white/75 sm:right-6 sm:bottom-4">
          <WeatherIcon code={state.weatherCode} isDay={state.isDay} />
          <span className="text-xs font-medium sm:text-sm">{Math.round(state.temperatureC)}°C</span>
        </div>
      )}
    </div>
  );
}
