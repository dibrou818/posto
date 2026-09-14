"use client";

import { useState } from "react";
import { labelClass } from "@/lib/ui";

// Same day-key vocabulary as WEEKDAY_FR in lib/eventSchedule.ts — this is
// the only place that ever writes a recurrence_rule, so keeping the two in
// lockstep means formatRecurrence's French label always has a match.
const DAYS = [
  { value: "monday", label: "Lundi" },
  { value: "tuesday", label: "Mardi" },
  { value: "wednesday", label: "Mercredi" },
  { value: "thursday", label: "Jeudi" },
  { value: "friday", label: "Vendredi" },
  { value: "saturday", label: "Samedi" },
  { value: "sunday", label: "Dimanche" },
] as const;

// Same visual family as DurationField's own selects — these two compound
// fields sit right next to each other in EventForm.
const selectClass =
  "min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 transition-colors focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10";

/** Splits a stored "weekly:thursday" back into {frequency, day} for
 * editing. Anything that doesn't match that exact shape (old free-text
 * data typed before this field existed, e.g. "tous les jeudis" or "bn")
 * falls back to "Aucune" — there's no structured form for it to round-trip
 * into, the same way DurationField snaps an odd old value to its nearest
 * option rather than trying to preserve something it has no field for. */
function parseRecurrence(stored: string | null | undefined): { frequency: "none" | "weekly"; day: (typeof DAYS)[number]["value"] } {
  const trimmed = (stored ?? "").trim();
  const [frequency, day] = trimmed.split(":");
  if (frequency === "weekly" && DAYS.some((d) => d.value === day)) {
    return { frequency: "weekly", day: day as (typeof DAYS)[number]["value"] };
  }
  return { frequency: "none", day: "monday" };
}

/** Récurrence input as two native <select> dropdowns (fréquence, jour)
 * instead of a free-text field where the owner had to type a private DSL
 * string ("weekly:thursday") by hand with only a placeholder as a hint —
 * exactly the problem duration_minutes had before DurationField. Composed
 * back into that same "weekly:<day>" string on submit under the original
 * `name`, so recurrence_rule stays a plain text column and
 * formatRecurrence's French label keeps working unchanged. */
export function RecurrenceField({
  label,
  name,
  defaultValue,
}: {
  label?: string;
  name: string;
  defaultValue?: string | null;
}) {
  const parsed = parseRecurrence(defaultValue);
  const [frequency, setFrequency] = useState<"none" | "weekly">(parsed.frequency);
  const [day, setDay] = useState<(typeof DAYS)[number]["value"]>(parsed.day);
  const combined = frequency === "weekly" ? `weekly:${day}` : "";

  return (
    <div className="min-w-0">
      {label !== undefined && <label className={labelClass}>{label}</label>}
      <div className="flex min-w-0 items-center gap-2">
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as "none" | "weekly")}
          aria-label="Fréquence"
          className={selectClass}
        >
          <option value="none">Aucune</option>
          <option value="weekly">Hebdomadaire</option>
        </select>
        {frequency === "weekly" && (
          <select
            value={day}
            onChange={(e) => setDay(e.target.value as (typeof DAYS)[number]["value"])}
            aria-label="Jour"
            className={selectClass}
          >
            {DAYS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        )}
      </div>
      <input type="hidden" name={name} value={combined} />
    </div>
  );
}
