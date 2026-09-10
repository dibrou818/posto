"use client";

import { EVENT_DATE_BUCKET_OPTIONS, type EventDateBucket } from "@/lib/eventDateFilter";

/** "Quand ?" segmented control for events on the map — only relevant once
 * the Lieu/Événement filter includes events, so the parent decides when to
 * show it. */
export function EventDateFilter({
  value,
  onChange,
}: {
  value: EventDateBucket;
  onChange: (value: EventDateBucket) => void;
}) {
  return (
    <div className="flex shrink-0 gap-1 overflow-x-auto rounded-lg border border-gray-300 bg-white p-1">
      {EVENT_DATE_BUCKET_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 ${
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
