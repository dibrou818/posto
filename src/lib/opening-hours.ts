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

// Whether `nowMinutes` falls inside [openM, closeM) — including a range
// that wraps past midnight (closeM < openM, e.g. 22:00-02:00), where "open"
// really means "from openM to 24:00, then again from 00:00 to closeM".
function withinRange(nowMinutes: number, openM: number, closeM: number): boolean {
  if (closeM < openM) return nowMinutes >= openM || nowMinutes < closeM;
  return nowMinutes >= openM && nowMinutes < closeM;
}

// A place can now also carry named sub-schedules (see listZoneNames below) —
// e.g. "Bassin extérieur" open fewer hours than the place's general hours.
// Whether the *place itself* reads as open only ever depends on its general
// schedule (zone_name null); a zone being closed doesn't close the place.
export function isOpenNow(hours: OpeningHour[], now: Date = new Date()) {
  const generalHours = hours.filter((h) => h.zone_name === null);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const today = generalHours.find((h) => h.day_of_week === now.getDay());
  if (today && withinRange(nowMinutes, toMinutes(today.open_time), toMinutes(today.close_time))) {
    return true;
  }

  // A schedule that closes after midnight is stored under the day it
  // *started* — a bar open Friday 22:00-02:00 is still "Friday" in the
  // database, so Saturday 00:30 has to check Friday's row too, not just
  // Saturday's own (which may not even exist, or may start later that day).
  const yesterday = generalHours.find((h) => h.day_of_week === (now.getDay() + 6) % 7);
  if (yesterday) {
    const openM = toMinutes(yesterday.open_time);
    const closeM = toMinutes(yesterday.close_time);
    if (closeM < openM && nowMinutes < closeM) return true;
  }

  return false;
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
