"use client";

import { useState } from "react";
import type { OpeningHour } from "@/lib/queries";
import { dayLabel, listZoneNames } from "@/lib/opening-hours";
import { compactInputClass } from "@/lib/ui";
import { SaveButton } from "@/components/ui/SaveButton";

/** One zone's 7-day grid. `zoneIndex` becomes the field-name suffix the
 * server action reads (open_<zoneIndex>_<day>, etc.) — 0 is always the
 * place's general hours, 1+ are named sub-schedules. Keyed by the caller on
 * the zone's *name*, not this index, so removing an earlier zone doesn't
 * reset a later one's checkboxes even though its index shifts down. */
function DayRows({ zoneIndex, hoursByDay }: { zoneIndex: number; hoursByDay: (OpeningHour | undefined)[] }) {
  const [openDays, setOpenDays] = useState(hoursByDay.map((h) => h !== undefined));

  return (
    <>
      {Array.from({ length: 7 }, (_, day) => day).map((day) => (
        <div key={day} className="flex items-center gap-3 rounded-md border border-gray-200 px-3 py-2">
          <label className="flex w-32 items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name={`open_${zoneIndex}_${day}`}
              defaultChecked={openDays[day]}
              onChange={(e) =>
                setOpenDays((prev) => prev.map((v, i) => (i === day ? e.target.checked : v)))
              }
            />
            {dayLabel(day)}
          </label>
          <input
            type="time"
            name={`open_time_${zoneIndex}_${day}`}
            defaultValue={hoursByDay[day]?.open_time.slice(0, 5) ?? "10:00"}
            disabled={!openDays[day]}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm disabled:opacity-40"
          />
          <span className="text-gray-500">à</span>
          <input
            type="time"
            name={`close_time_${zoneIndex}_${day}`}
            defaultValue={hoursByDay[day]?.close_time.slice(0, 5) ?? "19:00"}
            disabled={!openDays[day]}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm disabled:opacity-40"
          />
        </div>
      ))}
    </>
  );
}

function hoursByDayFor(hours: OpeningHour[], zoneName: string | null) {
  const scoped = hours.filter((h) => h.zone_name === zoneName);
  return Array.from({ length: 7 }, (_, day) => scoped.find((h) => h.day_of_week === day));
}

/** Weekly hours, plus optional named sub-schedules ("Bassin extérieur",
 * "Cuisine") each with their own 7-day grid — for a place where different
 * zones/services don't share one schedule. Zones are entirely client-side
 * state until submit: the server action deletes and re-inserts every row
 * for the place in one go (see saveOpeningHours), so removing a zone here
 * just means its rows don't come back in that reinsert. */
export function OpeningHoursForm({
  hours,
  action,
}: {
  hours: OpeningHour[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [zones, setZones] = useState<string[]>(() => listZoneNames(hours));
  const [newZoneName, setNewZoneName] = useState("");

  function addZone() {
    const trimmed = newZoneName.trim();
    if (!trimmed || zones.includes(trimmed)) return;
    setZones((prev) => [...prev, trimmed]);
    setNewZoneName("");
  }

  function removeZone(name: string) {
    setZones((prev) => prev.filter((z) => z !== name));
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
          Horaires généraux
        </p>
        <DayRows zoneIndex={0} hoursByDay={hoursByDayFor(hours, null)} />
      </div>

      {zones.map((zoneName, i) => (
        <div key={zoneName} className="flex flex-col gap-2 rounded-lg border border-dashed border-gray-300 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900">{zoneName}</p>
            <button
              type="button"
              onClick={() => removeZone(zoneName)}
              className="text-xs text-red-600 transition-colors hover:text-red-700 hover:underline"
            >
              Supprimer cette zone
            </button>
          </div>
          <input type="hidden" name="zone_names" value={zoneName} />
          <DayRows zoneIndex={i + 1} hoursByDay={hoursByDayFor(hours, zoneName)} />
        </div>
      ))}

      <div className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 p-3">
        <input
          value={newZoneName}
          onChange={(e) => setNewZoneName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addZone();
            }
          }}
          placeholder="Nom de la zone/du service, ex: Bassin extérieur"
          className={`flex-1 ${compactInputClass}`}
        />
        <button
          type="button"
          onClick={addZone}
          className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          + Ajouter une zone
        </button>
      </div>

      <SaveButton className="self-start" savedLabel="Horaires enregistrés">
        Enregistrer les horaires
      </SaveButton>
    </form>
  );
}
