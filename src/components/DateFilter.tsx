"use client";

import { useState } from "react";
import {
  EVENT_DATE_QUICK_OPTIONS,
  ALL_EVENT_DATES,
  formatEventDateFilterLabel,
  type EventDateFilterValue,
} from "@/lib/eventDateFilter";
import { toDateKey, addMonths, monthGridDays, WEEKDAY_LABELS } from "@/lib/dateRange";
import { FilterChip, FilterChipOption } from "@/components/ui/FilterChip";
import { CalendarKindIcon } from "@/components/KindIcon";

const monthFormatter = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function ChevronMiniIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={direction === "left" ? "M12.5 5 7.5 10l5 5" : "M7.5 5l5 5-5 5"} />
    </svg>
  );
}

/** The "Date précise" step's month-grid calendar — Airbnb-style range
 * picking: the first click on a day sets the start of the range, a second
 * click on a later day sets the end and commits the whole range at once
 * (start ≤ event date ≤ end). Clicking an earlier day than the current
 * start restarts the range from there instead of erroring, so there's no
 * dead end to back out of. Past days are disabled — a range that can only
 * ever match already-finished events isn't a real choice. */
function RangeCalendar({ onPick }: { onPick: (start: string, end: string) => void }) {
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [pendingStart, setPendingStart] = useState<string | null>(null);
  const todayKey = toDateKey(new Date());

  function handleDayClick(dateKey: string) {
    if (!pendingStart || dateKey < pendingStart) {
      setPendingStart(dateKey);
      return;
    }
    // dateKey >= pendingStart — dateKey === pendingStart is a valid
    // single-day range (clicking the same day twice).
    onPick(pendingStart, dateKey);
  }

  return (
    <div className="w-64 p-1">
      <div className="mb-1 flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => setVisibleMonth((m) => addMonths(m, -1))}
          aria-label="Mois précédent"
          className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
        >
          <ChevronMiniIcon direction="left" />
        </button>
        <span className="text-sm font-semibold text-gray-900">{capitalize(monthFormatter.format(visibleMonth))}</span>
        <button
          type="button"
          onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
          aria-label="Mois suivant"
          className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
        >
          <ChevronMiniIcon direction="right" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 px-0.5 pb-1 text-center text-[10px] font-medium text-gray-400">
        {WEEKDAY_LABELS.map((label, i) => (
          // Monday..Sunday all repeat "M" for mardi/mercredi and appear
          // twice (lundi/mardi, jeudi/vendredi start with the same
          // letter too in this abbreviation scheme) — index, not the
          // letter itself, is what's actually unique per column here.
          <span key={i}>{label}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5 px-0.5">
        {monthGridDays(visibleMonth).map(({ date, inMonth }) => {
          const key = toDateKey(date);
          const disabled = key < todayKey;
          const isStart = key === pendingStart;
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => handleDayClick(key)}
              aria-pressed={isStart}
              className={`aspect-square rounded-md text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 ${
                disabled
                  ? "cursor-not-allowed text-gray-300"
                  : isStart
                    ? "bg-gray-900 text-white"
                    : inMonth
                      ? "text-gray-700 hover:bg-gray-100"
                      : "text-gray-300 hover:bg-gray-100"
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <p className="px-1 pt-1.5 text-xs text-gray-500">
        {pendingStart
          ? "Choisissez la date de fin (ou une date plus tôt pour recommencer)."
          : "Choisissez une date de début."}
      </p>
    </div>
  );
}

/** Date chip next to KindFilter/BudgetFilter, same shared FilterChip shell
 * — the exact same dropdown-chip language on the home page and the map
 * (see FullScreenMap.tsx), not two independently-built "when" controls
 * that only look similar. Events-only, same reasoning as BudgetFilter. */
export function DateFilter({
  value,
  onChange,
}: {
  value: EventDateFilterValue;
  onChange: (value: EventDateFilterValue) => void;
}) {
  // "list" is the quick-option menu (Aujourd'hui/Demain/Ce week-end/Cette
  // semaine/Date précise); picking "Date précise" swaps this same panel
  // over to the calendar instead of opening a second popup — one filter,
  // one panel, just two steps deep for the one option that needs it.
  const [view, setView] = useState<"list" | "calendar">("list");

  function pickQuick(kind: "today" | "tomorrow" | "weekend" | "week", close: () => void) {
    // Tapping the already-active option clears it — same one-tap-to-undo
    // reflex as BudgetFilter's own options.
    onChange(value.kind === kind ? ALL_EVENT_DATES : { kind });
    close();
  }

  function pickRange(start: string, end: string, close: () => void) {
    onChange({ kind: "range", start, end });
    setView("list");
    close();
  }

  return (
    <FilterChip
      icon={<CalendarKindIcon />}
      label={formatEventDateFilterLabel(value)}
      onClear={value.kind !== "all" ? () => onChange(ALL_EVENT_DATES) : undefined}
      clearLabel="Réinitialiser le filtre de date"
      panelClassName={view === "calendar" ? "w-auto" : "w-52"}
    >
      {(close) =>
        view === "list" ? (
          <>
            {EVENT_DATE_QUICK_OPTIONS.map((option) => (
              <FilterChipOption
                key={option.kind}
                label={option.label}
                selected={value.kind === option.kind}
                onClick={() => pickQuick(option.kind, close)}
              />
            ))}
            <FilterChipOption
              label={value.kind === "range" ? formatEventDateFilterLabel(value) : "Date précise"}
              selected={value.kind === "range"}
              onClick={() => setView("calendar")}
            />
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setView("list")}
              className="mb-1 flex items-center gap-1 rounded-md px-1 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
            >
              <ChevronMiniIcon direction="left" />
              Options rapides
            </button>
            <RangeCalendar onPick={(start, end) => pickRange(start, end, close)} />
          </>
        )
      }
    </FilterChip>
  );
}
