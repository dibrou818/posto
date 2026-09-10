"use client";

import { useState } from "react";
import type { UserLocation } from "@/lib/usePlacesExplorer";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "denied" }
  | { status: "granted"; city: string; temperatureC: number | null };

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

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  );
}

export function LocationWeather({
  onLocated,
  onCityResolved,
}: {
  onLocated: (loc: UserLocation) => void;
  /** Fired once the city name resolves (or fails to), bundled with the same
   * coords — a separate callback rather than reusing `onLocated` so callers
   * needing the city (e.g. auto-filling a location filter) never have to
   * read back a possibly-stale `userLocation` from their own state. */
  onCityResolved?: (city: string | null, loc: UserLocation) => void;
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
          });
        } catch {
          onCityResolved?.(null, location);
          setState({ status: "granted", city: "Votre position", temperatureC: null });
        }
      },
      () => setState({ status: "denied" }),
      { timeout: 8000 },
    );
  }

  if (state.status === "granted") {
    return (
      <div className="rounded-xl bg-gradient-to-br from-gray-900 to-gray-700 px-5 py-4 text-white">
        <p className="text-xs font-medium tracking-wide text-gray-300 uppercase">Votre position</p>
        <p className="mt-1 text-2xl font-bold">{state.city}</p>
        {state.temperatureC !== null && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-200">
            <SunIcon />
            {Math.round(state.temperatureC)}°C actuellement
          </p>
        )}
      </div>
    );
  }

  const label =
    state.status === "loading"
      ? "Localisation en cours..."
      : state.status === "denied"
        ? "Localisation refusée — cliquez pour réessayer"
        : "Cliquer pour activer la localisation";

  return (
    <button
      type="button"
      onClick={requestLocation}
      disabled={state.status === "loading"}
      className="flex w-full items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 py-4 text-left text-gray-500 transition-colors hover:border-gray-400 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 disabled:opacity-60"
    >
      <LocationIcon />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
