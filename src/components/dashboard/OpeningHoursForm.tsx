"use client";

import { useState } from "react";
import type { OpeningHour } from "@/lib/queries";
import { dayLabel } from "@/lib/opening-hours";
import { Button } from "@/components/ui/Button";

export function OpeningHoursForm({
  hours,
  action,
}: {
  hours: OpeningHour[];
  action: (formData: FormData) => Promise<void>;
}) {
  const initial = Array.from({ length: 7 }, (_, day) =>
    hours.find((h) => h.day_of_week === day),
  );
  const [openDays, setOpenDays] = useState(initial.map((h) => h !== undefined));

  return (
    <form action={action} className="flex flex-col gap-2">
      {Array.from({ length: 7 }, (_, day) => day).map((day) => (
        <div key={day} className="flex items-center gap-3 rounded-md border border-gray-200 px-3 py-2">
          <label className="flex w-32 items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name={`open_${day}`}
              defaultChecked={openDays[day]}
              onChange={(e) =>
                setOpenDays((prev) => prev.map((v, i) => (i === day ? e.target.checked : v)))
              }
            />
            {dayLabel(day)}
          </label>
          <input
            type="time"
            name={`open_time_${day}`}
            defaultValue={initial[day]?.open_time.slice(0, 5) ?? "10:00"}
            disabled={!openDays[day]}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm disabled:opacity-40"
          />
          <span className="text-gray-500">à</span>
          <input
            type="time"
            name={`close_time_${day}`}
            defaultValue={initial[day]?.close_time.slice(0, 5) ?? "19:00"}
            disabled={!openDays[day]}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm disabled:opacity-40"
          />
        </div>
      ))}
      <Button type="submit" className="mt-2 self-start">
        Enregistrer les horaires
      </Button>
    </form>
  );
}
