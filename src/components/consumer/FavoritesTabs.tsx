"use client";

import { useState, type ReactNode } from "react";

/** Événements / Lieux switch for the favourites page: one tap, no scrolling
 * past one list to reach the other. Both panels are rendered by the server
 * page and passed in, so this only decides which one is visible. */
export function FavoritesTabs({
  eventsCount,
  placesCount,
  events,
  places,
}: {
  eventsCount: number;
  placesCount: number;
  events: ReactNode;
  places: ReactNode;
}) {
  const [tab, setTab] = useState<"events" | "places">("events");
  const options = [
    { value: "events" as const, label: "Événements", count: eventsCount },
    { value: "places" as const, label: "Lieux", count: placesCount },
  ];

  return (
    <>
      <div role="tablist" aria-label="Type de favoris" className="mb-6 flex w-full gap-1 rounded-lg border border-gray-300 bg-white p-0.5 sm:w-fit">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            id={`favorites-tab-${option.value}`}
            aria-selected={tab === option.value}
            aria-controls={`favorites-panel-${option.value}`}
            onClick={() => setTab(option.value)}
            className={`min-h-9 flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 sm:flex-none ${
              tab === option.value ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {option.label}
            <span className={`ml-1.5 text-xs ${tab === option.value ? "text-white/70" : "text-gray-400"}`}>{option.count}</span>
          </button>
        ))}
      </div>
      <div role="tabpanel" id="favorites-panel-events" aria-labelledby="favorites-tab-events" hidden={tab !== "events"}>
        {events}
      </div>
      <div role="tabpanel" id="favorites-panel-places" aria-labelledby="favorites-tab-places" hidden={tab !== "places"}>
        {places}
      </div>
    </>
  );
}
