"use client";

import { useState } from "react";
import { TextareaField } from "@/components/ui/TextField";
import { URGENT_MESSAGE_MAX_LENGTH } from "@/lib/fieldLimits";
import { toDatetimeLocalValue } from "@/lib/eventSchedule";
import { labelClass } from "@/lib/ui";

const fieldClass =
  "min-w-0 rounded-lg border border-gray-300 px-2 py-2 text-sm text-gray-900 transition-colors focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10";

const PRESETS: { label: string; compute: () => Date }[] = [
  {
    label: "Ce soir",
    compute: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(6, 0, 0, 0);
      return d;
    },
  },
  { label: "24 h", compute: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  { label: "7 jours", compute: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
];

const toLocalValue = (d: Date) => toDatetimeLocalValue(d.toISOString());

/** The urgent message and when it disappears. Quick durations ("Ce soir",
 * "24 h", "7 jours") cover the usual cases in one tap; the date and time
 * below stay editable for anything else, and an empty expiry means the
 * message stays until it's removed from the banner on top of the place pages. */
export function UrgentMessageFields({
  defaultMessage,
  defaultExpiresAt,
}: {
  defaultMessage: string | null;
  defaultExpiresAt: string | null;
}) {
  const [expiry, setExpiry] = useState(toDatetimeLocalValue(defaultExpiresAt));
  const [date = "", time = ""] = expiry.split("T");

  return (
    <div id="urgent" className="flex scroll-mt-24 flex-col gap-4">
      <TextareaField
        label="Message"
        name="urgent_message"
        rows={2}
        maxLength={URGENT_MESSAGE_MAX_LENGTH}
        placeholder="Fermeture exceptionnelle ce soir..."
        defaultValue={defaultMessage ?? ""}
      />
      <div>
        <p className={labelClass}>Disparaît</p>
        <div className="mb-2 flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setExpiry(toLocalValue(preset.compute()))}
              className="inline-flex min-h-10 items-center rounded-full border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setExpiry("")}
            className="inline-flex min-h-10 items-center rounded-full border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
          >
            Jamais
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setExpiry(e.target.value ? `${e.target.value}T${time || "23:59"}` : "")}
            aria-label="Date de fin"
            className={`min-w-[8.5rem] flex-[3] ${fieldClass}`}
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setExpiry(date ? `${date}T${e.target.value || "00:00"}` : "")}
            aria-label="Heure de fin"
            className={`min-w-[5.5rem] flex-[2] ${fieldClass}`}
          />
        </div>
        <input type="hidden" name="urgent_message_expires_at" value={date && time ? `${date}T${time}` : ""} />
      </div>
    </div>
  );
}
