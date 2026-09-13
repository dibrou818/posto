"use client";

import { useEffect, useRef, useState } from "react";
import { RESULT_KIND_OPTIONS, type ResultKindFilter } from "@/lib/resultFilter";
import { EVENT_DATE_QUICK_OPTIONS, ALL_EVENT_DATES, type EventDateFilterValue } from "@/lib/eventDateFilter";

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M8 12h8M11 18h2" />
    </svg>
  );
}

// "2026-09-12" (the <input type="date"> value, always local) -> "12 sept."
// — parsed by hand rather than `new Date("2026-09-12")`, which the spec
// treats as UTC midnight and can display as the *previous* day in any
// timezone behind UTC.
const dateChipFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
function formatChosenDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return dateChipFormatter.format(new Date(year, month - 1, day));
}

/** The map's one filter entry point, at the right end of the search bar —
 * "quoi" (Lieux/Événements/Tout) and, when events are in play, "quand"
 * (Aujourd'hui/Ce week-end/Cette semaine, or one exact date) live in the
 * same panel instead of a permanent row of pills, so the map itself isn't
 * permanently cluttered by a choice most visits never touch. */
export function MapFilterButton({
  kindFilter,
  onKindFilterChange,
  dateFilter,
  onDateFilterChange,
}: {
  kindFilter: ResultKindFilter;
  onKindFilterChange: (value: ResultKindFilter) => void;
  dateFilter: EventDateFilterValue;
  onDateFilterChange: (value: EventDateFilterValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // "place" hides every event marker on the map — a "when" choice would
  // have nothing left to act on, so the section itself doesn't show.
  const showDateSection = kindFilter !== "place";
  const isFiltered = kindFilter !== "all" || dateFilter.kind !== "all";

  function selectQuickDate(kind: "today" | "weekend" | "week") {
    // Tapping the already-active chip clears it back to "all dates" — the
    // one way to undo a quick pick without hunting for a separate reset.
    onDateFilterChange(dateFilter.kind === kind ? ALL_EVENT_DATES : { kind });
    setShowDatePicker(false);
  }

  function clearDate() {
    onDateFilterChange(ALL_EVENT_DATES);
    setShowDatePicker(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Filtrer"
        aria-expanded={open}
        className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 ${
          open ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        <FilterIcon />
        {isFiltered && !open && (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-violet-600" />
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 z-20 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
          <p className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">Quoi</p>
          <div className="flex gap-1.5">
            {RESULT_KIND_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onKindFilterChange(option.value)}
                aria-pressed={kindFilter === option.value}
                className={`flex-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 ${
                  kindFilter === option.value ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {showDateSection && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">Quand</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {EVENT_DATE_QUICK_OPTIONS.map((option) => (
                  <button
                    key={option.kind}
                    type="button"
                    onClick={() => selectQuickDate(option.kind)}
                    aria-pressed={dateFilter.kind === option.kind}
                    className={`shrink-0 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 ${
                      dateFilter.kind === option.kind ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
                <span className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowDatePicker((v) => !v)}
                    aria-pressed={dateFilter.kind === "date"}
                    className={`rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 ${
                      dateFilter.kind === "date" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {dateFilter.kind === "date" ? formatChosenDate(dateFilter.date) : "Date précise"}
                  </button>
                  {dateFilter.kind === "date" && (
                    <button
                      type="button"
                      onClick={clearDate}
                      aria-label="Effacer la date choisie"
                      className="text-gray-400 transition-colors hover:text-gray-700"
                    >
                      ✕
                    </button>
                  )}
                </span>
              </div>
              {showDatePicker && (
                <input
                  type="date"
                  autoFocus
                  defaultValue={dateFilter.kind === "date" ? dateFilter.date : ""}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    onDateFilterChange({ kind: "date", date: e.target.value });
                    setShowDatePicker(false);
                  }}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
