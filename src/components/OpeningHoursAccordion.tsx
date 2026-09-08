"use client";

import { useId, useState } from "react";
import type { scheduleByDay } from "@/lib/opening-hours";

type DaySchedule = ReturnType<typeof scheduleByDay>[number];

function formatHours(day: DaySchedule) {
  return day.hours.length === 0
    ? "Fermé"
    : day.hours.map((h) => `${h.open_time.slice(0, 5)} - ${h.close_time.slice(0, 5)}`).join(", ");
}

/** Collapsible weekly schedule: shows only today's hours by default, and
 * expands to the full week on click. `todayIndex` matches `Date#getDay()`
 * (0 = Sunday), same convention as `day.dayOfWeek`. */
export function OpeningHoursAccordion({
  schedule,
  todayIndex,
}: {
  schedule: DaySchedule[];
  todayIndex: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const today = schedule.find((day) => day.dayOfWeek === todayIndex) ?? schedule[0];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white text-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
      >
        <span className="flex items-center gap-2">
          <span className="font-medium text-gray-900">Aujourd&apos;hui · {today.label}</span>
          <span className="text-gray-600">{formatHours(today)}</span>
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
          {schedule.map((day) => (
            <li
              key={day.dayOfWeek}
              className={`flex justify-between px-4 py-2 ${
                day.dayOfWeek === todayIndex ? "bg-gray-50" : ""
              }`}
            >
              <span className="text-gray-600">{day.label}</span>
              <span className="text-gray-900">{formatHours(day)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
