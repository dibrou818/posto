"use client";

import { useState } from "react";
import type { OpeningHour } from "@/lib/queries";
import { dayLabel, listZoneNames } from "@/lib/opening-hours";
import { SaveButton } from "@/components/ui/SaveButton";
import { FormSection, FormActions } from "@/components/dashboard/FormSection";
import { UnsavedChangesGuard } from "@/components/dashboard/UnsavedChangesGuard";

// Monday first, as people read a week in France; the stored day numbers
// (0 = Sunday) are unchanged.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

type DayState = { open: boolean; from: string; to: string };

const timeClass =
  "min-h-10 w-[6.5rem] rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 disabled:opacity-40";

const toolButtonClass =
  "inline-flex min-h-10 items-center rounded-full border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50";

/** One zone's week: a switch per day with its opening and closing time on
 * the same line, plus shortcuts for the common cases (same hours every day,
 * open all day, closed). `zoneIndex` becomes the field-name suffix the
 * server action reads (open_<zoneIndex>_<day>, etc.) — 0 is always the
 * place's general hours, 1+ are named sub-schedules. */
function ZoneHours({ zoneIndex, hoursByDay }: { zoneIndex: number; hoursByDay: (OpeningHour | undefined)[] }) {
  const [days, setDays] = useState<DayState[]>(() =>
    hoursByDay.map((h) => ({
      open: h !== undefined,
      from: h?.open_time.slice(0, 5) ?? "10:00",
      to: h?.close_time.slice(0, 5) ?? "19:00",
    })),
  );

  const update = (day: number, patch: Partial<DayState>) =>
    setDays((prev) => prev.map((d, i) => (i === day ? { ...d, ...patch } : d)));

  function sameEveryDay() {
    const reference = DAY_ORDER.map((d) => days[d]).find((d) => d.open) ?? days[1];
    setDays(days.map(() => ({ open: true, from: reference.from, to: reference.to })));
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">
        <button type="button" onClick={sameEveryDay} className={toolButtonClass}>
          Même horaire chaque jour
        </button>
        <button
          type="button"
          onClick={() => setDays(days.map(() => ({ open: true, from: "00:00", to: "23:59" })))}
          className={toolButtonClass}
        >
          Ouvert 24 h/24
        </button>
        <button type="button" onClick={() => setDays(days.map((d) => ({ ...d, open: false })))} className={toolButtonClass}>
          Tout fermer
        </button>
      </div>

      <ul className="divide-y divide-gray-200 border-y border-gray-200">
        {DAY_ORDER.map((day) => {
          const state = days[day];
          return (
            <li key={day} className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <label className="flex min-h-10 w-32 shrink-0 cursor-pointer items-center gap-3 text-sm font-medium text-gray-900">
                <input
                  type="checkbox"
                  name={`open_${zoneIndex}_${day}`}
                  checked={state.open}
                  onChange={(e) => update(day, { open: e.target.checked })}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className="relative h-6 w-10 shrink-0 rounded-full bg-gray-300 transition-colors peer-checked:bg-gray-900 peer-focus-visible:ring-2 peer-focus-visible:ring-gray-900/30 peer-focus-visible:ring-offset-2 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4"
                />
                {dayLabel(day)}
              </label>
              {state.open ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    name={`open_time_${zoneIndex}_${day}`}
                    value={state.from}
                    onChange={(e) => update(day, { from: e.target.value })}
                    aria-label={`${dayLabel(day)} : ouverture`}
                    className={timeClass}
                  />
                  <span className="text-sm text-gray-500">à</span>
                  <input
                    type="time"
                    name={`close_time_${zoneIndex}_${day}`}
                    value={state.to}
                    onChange={(e) => update(day, { to: e.target.value })}
                    aria-label={`${dayLabel(day)} : fermeture`}
                    className={timeClass}
                  />
                </div>
              ) : (
                <span className="text-sm text-gray-500">Fermé</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function hoursByDayFor(hours: OpeningHour[], zoneName: string | null) {
  const scoped = hours.filter((h) => h.zone_name === zoneName);
  return Array.from({ length: 7 }, (_, day) => scoped.find((h) => h.day_of_week === day));
}

/** Weekly hours, plus optional named sub-schedules ("Bassin extérieur",
 * "Cuisine") each with their own week — for a place where different
 * zones/services don't share one schedule. Zones are client-side state
 * until submit: the server replaces every row for the place in one
 * transaction (see saveOpeningHours), so removing a zone here just means
 * its rows don't come back. */
export function OpeningHoursForm({
  hours,
  action,
}: {
  hours: OpeningHour[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [zones, setZones] = useState<string[]>(() => listZoneNames(hours));
  const [newZoneName, setNewZoneName] = useState("");
  const [adding, setAdding] = useState(false);

  function addZone() {
    const trimmed = newZoneName.trim();
    if (!trimmed || zones.includes(trimmed)) return;
    setZones((prev) => [...prev, trimmed]);
    setNewZoneName("");
    setAdding(false);
  }

  return (
    <form action={action} className="flex flex-col">
      <UnsavedChangesGuard />
      <FormSection
        first
        title="Horaires généraux"
        description="Pour une fermeture après minuit, indiquez l'heure du lendemain (par exemple 02:00)."
      >
        <ZoneHours zoneIndex={0} hoursByDay={hoursByDayFor(hours, null)} />
      </FormSection>

      {zones.map((zoneName, i) => (
        <FormSection key={zoneName} title={zoneName} description="Horaires propres à cette zone ou à ce service.">
          <input type="hidden" name="zone_names" value={zoneName} />
          <ZoneHours zoneIndex={i + 1} hoursByDay={hoursByDayFor(hours, zoneName)} />
          <div>
            <button
              type="button"
              onClick={() => setZones((prev) => prev.filter((z) => z !== zoneName))}
              className="inline-flex min-h-10 items-center rounded-lg border border-red-200 px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              Retirer cette zone
            </button>
          </div>
        </FormSection>
      ))}

      <FormSection title="Horaires séparés" description="Pour un bassin, une cuisine, un service qui n'ouvre pas aux mêmes heures que le lieu.">
        {adding ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              autoFocus
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addZone();
                }
              }}
              placeholder="Ex : Bassin extérieur"
              aria-label="Nom de la zone"
              className="min-h-11 min-w-[12rem] flex-1 rounded-xl border border-gray-300 bg-white px-3 text-base text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            />
            <button type="button" onClick={addZone} className={toolButtonClass}>
              Ajouter
            </button>
            <button type="button" onClick={() => setAdding(false)} className="inline-flex min-h-10 items-center px-2 text-sm text-gray-600 hover:text-gray-900">
              Annuler
            </button>
          </div>
        ) : (
          <div>
            <button type="button" onClick={() => setAdding(true)} className={toolButtonClass}>
              + Ajouter des horaires séparés
            </button>
          </div>
        )}
      </FormSection>

      <FormActions>
        <SaveButton savedLabel="Horaires enregistrés">Enregistrer les horaires</SaveButton>
      </FormActions>
    </form>
  );
}
