"use client";

import { useState } from "react";
import { labelClass } from "@/lib/ui";

const HOURS = Array.from({ length: 13 }, (_, i) => i); // 0-12h — covers everything from a quick activity to a full-day event
const MINUTES = [0, 15, 30, 45];

// min-w-0 + flex-1 (not a fixed/intrinsic width) so the two selects always
// share whatever space their container actually has — e.g. one column of a
// two-column grid next to "Restriction" — and shrink together instead of
// either one overflowing past its column's edge. Same reasoning as the
// opening-hours time-range inputs.
const selectClass =
  "min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 transition-colors focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10";

/** Duration input as two native <select> dropdowns side by side — hours,
 * then minutes in 15-min steps — instead of a custom popup/picker: a native
 * select opens its own browser-positioned list that can never overflow the
 * viewport the way a hand-built dropdown or the native datetime picker can,
 * and needs no extra tap to open a second layer on top of the form. Composed
 * back into one integer number of minutes on submit under the same single
 * `name` the server action already expects — duration_minutes stays a plain
 * integer column, no schema change. Beats a bare "minutes" number field an
 * owner has to do the ×60 math for themselves before typing (and which is
 * also what actually drives the poster/event display, so getting it right
 * matters more than the free-text field this replaces let on). */
export function DurationField({
  label,
  name,
  defaultValue,
}: {
  /** Omit (like TextField) to render without a label row — used for the
   * label-less compact "add" rows (see ActivitiesManager/EventsManager). */
  label?: string;
  name: string;
  defaultValue?: number | null;
}) {
  // Snaps any pre-existing odd value (e.g. old free-text data like "50") to
  // the nearest 15-minute step rather than silently dropping the minutes
  // past the last matching option — an owner editing an existing
  // activity/event should see something close to what was actually saved.
  const initialTotal = defaultValue && defaultValue > 0 ? defaultValue : 0;
  const initialHours = Math.floor(initialTotal / 60);
  const initialMinutes = Math.round((initialTotal % 60) / 15) * 15;

  const [hours, setHours] = useState(initialTotal > 0 ? initialHours : "");
  const [minutes, setMinutes] = useState(initialTotal > 0 ? initialMinutes : "");

  const totalMinutes = (Number(hours) || 0) * 60 + (Number(minutes) || 0);
  const combined = totalMinutes > 0 ? String(totalMinutes) : "";

  return (
    <div className="min-w-0">
      {label !== undefined && <label className={labelClass}>{label}</label>}
      <div className="flex min-w-0 items-center gap-2">
        <select
          value={hours}
          onChange={(e) => setHours(e.target.value === "" ? "" : Number(e.target.value))}
          aria-label="Heures"
          className={selectClass}
        >
          <option value="">–</option>
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {h} h
            </option>
          ))}
        </select>
        <select
          value={minutes}
          onChange={(e) => setMinutes(e.target.value === "" ? "" : Number(e.target.value))}
          aria-label="Minutes"
          className={selectClass}
        >
          <option value="">–</option>
          {MINUTES.map((m) => (
            <option key={m} value={m}>
              {m.toString().padStart(2, "0")} min
            </option>
          ))}
        </select>
      </div>
      <input type="hidden" name={name} value={combined} />
    </div>
  );
}
