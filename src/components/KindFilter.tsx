"use client";

import { RESULT_KIND_OPTIONS, type ResultKindFilter } from "@/lib/resultFilter";

// Events-first, then places, "Tout" last — the reverse of
// RESULT_KIND_OPTIONS' own order. Reordered locally here rather than in
// resultFilter.ts itself: that array is also SearchBar's (its pills, hidden
// on the home page since this component controls the filter there — see
// SearchBar's own `hidden={isControlled}`) and MapFilterButton's, and
// reordering the shared source would have silently changed those too. This
// is the one place that's actually visible, so it's the one place that
// changes.
const HOME_KIND_ORDER: ResultKindFilter[] = ["event", "place", "all"];
const HOME_KIND_OPTIONS = HOME_KIND_ORDER.map(
  (value) => RESULT_KIND_OPTIONS.find((option) => option.value === value)!,
);

/** Persistent Lieux/Événements/Tout toggle shown next to the search bar —
 * unlike SearchBar's own pills (only visible while its dropdown is open),
 * this stays on screen and also drives what the browse grid below shows. */
export function KindFilter({
  value,
  onChange,
}: {
  value: ResultKindFilter;
  onChange: (value: ResultKindFilter) => void;
}) {
  return (
    <div className="flex shrink-0 gap-1 rounded-lg border border-gray-300 bg-white p-1">
      {HOME_KIND_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 ${
            value === option.value
              ? "bg-gray-900 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
