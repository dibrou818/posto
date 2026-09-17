"use client";

import { useId, useState } from "react";
import { scheduleByDay, isOpenNow, type OpeningHour } from "@/lib/opening-hours";

type DaySchedule = ReturnType<typeof scheduleByDay>[number];

/** Just the hour ranges for a day — "Fermé" is no longer folded in here,
 * since that word now has its own colored treatment (see openLabelClass
 * below) wherever it's shown, instead of being duplicated in two different
 * colors on the same row. */
function formatHourRanges(day: DaySchedule): string | null {
  if (day.hours.length === 0) return null;
  return day.hours.map((h) => `${h.open_time.slice(0, 5)} - ${h.close_time.slice(0, 5)}`).join(", ");
}

// Plain colored text, deliberately not a pill/badge (no background, no
// border) — this app already has that colored-box treatment for the
// place page's own top-of-page status badge; repeating it here, right
// next to the hour ranges it's summarizing, would read as two competing
// status indicators instead of one detail line.
function openLabelClass(open: boolean) {
  return open ? "text-green-600" : "text-red-600";
}

/** Collapsible weekly schedule: shows only today's hours by default, and
 * expands to the full week on click. `todayIndex` matches `Date#getDay()`
 * (0 = Sunday), same convention as `day.dayOfWeek`.
 *
 * Takes the raw `hours` (not a pre-computed `schedule`) so it can work out
 * *live* open/closed status itself via `isOpenNow` — scoped to `zoneName`
 * exactly like `scheduleByDay` already scopes the schedule it's built from,
 * so a zone's own accordion (a pool's separate hours, say) reports its own
 * status rather than borrowing the place's general one. */
export function OpeningHoursAccordion({
  hours,
  zoneName = null,
  todayIndex,
}: {
  hours: OpeningHour[];
  zoneName?: string | null;
  todayIndex: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const schedule = scheduleByDay(hours, zoneName);
  const today = schedule.find((day) => day.dayOfWeek === todayIndex) ?? schedule[0];
  const openNow = isOpenNow(hours, zoneName);
  const todayHours = formatHourRanges(today);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white text-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
      >
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-medium text-gray-900">Aujourd&apos;hui · {today.label}</span>
          <span className={`font-medium ${openLabelClass(openNow)}`}>{openNow ? "Ouvert" : "Fermé"}</span>
          {todayHours && <span className="text-gray-600">{todayHours}</span>}
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {expanded && (
        <ul id={panelId} className="divide-y divide-gray-100 border-t border-gray-100">
          {schedule.map((day) => {
            const hoursText = formatHourRanges(day);
            return (
              <li
                key={day.dayOfWeek}
                className={`flex justify-between px-4 py-2 ${
                  day.dayOfWeek === todayIndex ? "bg-gray-50" : ""
                }`}
              >
                <span className="text-gray-600">{day.label}</span>
                {hoursText ? (
                  <span className="text-gray-900">{hoursText}</span>
                ) : (
                  <span className={openLabelClass(false)}>Fermé</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
