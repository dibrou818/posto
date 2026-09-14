"use client";

import { useState } from "react";
import { labelClass } from "@/lib/ui";

function splitDatetimeLocal(value: string): { date: string; time: string } {
  const [date = "", time = ""] = value.split("T");
  return { date, time };
}

const fieldClass =
  "min-w-0 rounded-lg border border-gray-300 px-2 py-2 text-sm text-gray-900 transition-colors focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10";

/** Start/end datetime input split into a native `<input type="date">` +
 * `<input type="time">` side by side, instead of one `type="datetime-local"`
 * — composed back into the exact same "YYYY-MM-DDTHH:mm" string on submit
 * under the same single `name`, so nothing server-side changes (see
 * lib/eventSchedule.ts's toDatetimeLocalValue, which already produces that
 * same format for defaultValue).
 *
 * Why split it at all: the combined datetime-local control's own native
 * picker has a well-documented mobile bug (particularly Android Chrome) —
 * its popup positions itself relative to the input but doesn't reliably
 * reflow to stay fully on-screen, so part of it (often exactly the minutes
 * column) can render past the viewport edge with no way to reach it, and
 * that popup is OS/browser-drawn chrome our CSS has no access to in order
 * to fix directly. A plain date input's calendar grid and a plain time
 * input's scroll wheel are each simpler native widgets that don't have this
 * bug, so splitting the field sidesteps it entirely rather than trying to
 * patch it. */
export function DateTimeField({
  label,
  name,
  required,
  defaultValue,
  className = "",
}: {
  label?: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  /** Appended to both sub-inputs — e.g. PlaceForm's amber-tinted urgent
   * message section. */
  className?: string;
}) {
  const initial = splitDatetimeLocal(defaultValue ?? "");
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);

  const combined = date && time ? `${date}T${time}` : "";

  return (
    <div className="min-w-0">
      {label !== undefined && <label className={labelClass}>{label}</label>}
      <div className="flex min-w-0 flex-wrap gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required={required}
          aria-label="Date"
          className={`min-w-[8.5rem] flex-[3] ${fieldClass} ${className}`.trim()}
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required={required}
          aria-label="Heure"
          className={`min-w-[5.5rem] flex-[2] ${fieldClass} ${className}`.trim()}
        />
      </div>
      <input type="hidden" name={name} value={combined} />
    </div>
  );
}
