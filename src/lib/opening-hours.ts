import type { Tables } from "@/types/database.types";

export type OpeningHour = Tables<"opening_hours">;

const DAY_LABELS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

export function dayLabel(dayOfWeek: number) {
  return DAY_LABELS[dayOfWeek];
}

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// A place can now also carry named sub-schedules (see listZoneNames below) —
// e.g. "Bassin extérieur" open fewer hours than the place's general hours.
// Whether the *place itself* reads as open only ever depends on its general
// schedule (zone_name null); a zone being closed doesn't close the place.
export function isOpenNow(hours: OpeningHour[], now: Date = new Date()) {
  const generalHours = hours.filter((h) => h.zone_name === null);
  const today = generalHours.find((h) => h.day_of_week === now.getDay());
  if (!today) return false;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return (
    nowMinutes >= toMinutes(today.open_time) &&
    nowMinutes < toMinutes(today.close_time)
  );
}

/** Every distinct named sub-schedule present in a place's hours, in the
 * order they first appear — empty when the place only has general hours. */
export function listZoneNames(hours: OpeningHour[]): string[] {
  const seen: string[] = [];
  for (const h of hours) {
    if (h.zone_name && !seen.includes(h.zone_name)) seen.push(h.zone_name);
  }
  return seen;
}

/** Week schedule for one zone — `zoneName: null` (the default) is the
 * place's general hours; pass one of `listZoneNames()`'s results to get a
 * specific sub-schedule's week instead. */
export function scheduleByDay(hours: OpeningHour[], zoneName: string | null = null) {
  const scoped = hours.filter((h) => h.zone_name === zoneName);
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    label: dayLabel(dayOfWeek),
    hours: scoped.filter((h) => h.day_of_week === dayOfWeek),
  }));
}
