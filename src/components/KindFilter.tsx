"use client";

import { RESULT_KIND_OPTIONS, type ResultKindFilter } from "@/lib/resultFilter";

// Events-first, then places, "Tout" last — the reverse of
// RESULT_KIND_OPTIONS' own order. Reordered locally here rather than in
// resultFilter.ts itself: that array is also SearchBar's (its pills, hidden
// wherever this component controls the filter instead — see SearchBar's own
// `hidden={isControlled}`), and reordering the shared source would have
// silently changed those pills' order too. This is the one place that's
// actually persistently visible (on both the home page and the map — see
// HomeExplorer.tsx/FullScreenMap.tsx), so it's the one place that changes.
const KIND_ORDER: ResultKindFilter[] = ["event", "place", "all"];
const KIND_OPTIONS = KIND_ORDER.map(
  (value) => RESULT_KIND_OPTIONS.find((option) => option.value === value)!,
);

/** Persistent Lieux/Événements/Tout toggle shown next to the search bar, on
 * both the home page and the map (the literal same component in both —
 * see FullScreenMap.tsx) — unlike SearchBar's own pills (only visible
 * while its dropdown is open), this stays on screen and also drives what
 * the browse grid/map markers below actually show. */
export function KindFilter({
  value,
  onChange,
}: {
  value: ResultKindFilter;
  onChange: (value: ResultKindFilter) => void;
}) {
  return (
    // shrink-0 keeps this from being squeezed by neighbors on a plain
    // inline row (desktop); flex-1 on each button below is what lets it
    // spread out to actually fill a wider slot when a caller stretches
    // the whole thing full-width instead (the mobile grid row — see
    // HomeExplorer.tsx/FullScreenMap.tsx) — on desktop, where nothing
    // forces this wider than its own content, flex-1 has nothing to grow
    // into and the three pills render exactly as before.
    <div className="flex shrink-0 gap-1 rounded-lg border border-gray-300 bg-white p-1">
      {KIND_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`min-h-11 flex-1 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 ${
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
