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
// schedule (zone_name null, the default here); a zone being closed doesn't
// close the place — pass that zone's own name to check *its* status
// instead (see OpeningHoursAccordion, which does exactly that for its own
// zone-scoped accordion).
export function isOpenNow(hours: OpeningHour[], zoneName: string | null = null, now: Date = new Date()) {
  const scopedHours = hours.filter((h) => h.zone_name === zoneName);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const today = scopedHours.find((h) => h.day_of_week === now.getDay());
  if (today && withinRange(nowMinutes, toMinutes(today.open_time), toMinutes(today.close_time))) {
    return true;
  }

  // A schedule that closes after midnight is stored under the day it
  // *started* — a bar open Friday 22:00-02:00 is still "Friday" in the
  // database, so Saturday 00:30 has to check Friday's row too, not just
  // Saturday's own (which may not even exist, or may start later that day).
  const yesterday = scopedHours.find((h) => h.day_of_week === (now.getDay() + 6) % 7);
  if (yesterday) {
    const openM = toMinutes(yesterday.open_time);
    const closeM = toMinutes(yesterday.close_time);
    if (closeM < openM && nowMinutes < closeM) return true;
  }

  return false;
}

export type OpenStatus =
  | { open: true; closesInMinutes: number | null }
  | { open: false; opensInMinutes: number | null };

/** Same "is it open" logic as `isOpenNow`, but also says *how soon* that
 * changes — the raw boolean alone can't tell "just opened, plenty of time
 * left" from "closing in 10 minutes", which is exactly the distinction that
 * makes a status badge actually actionable instead of decorative. Only
 * looks as far as today/yesterday/tomorrow's general-hours rows (no full
 * week traversal) — good enough to catch every near-term transition, and
 * keeps this a cheap, synchronous read of data callers already have. */
export function getOpenStatus(
  hours: OpeningHour[],
  zoneName: string | null = null,
  now: Date = new Date(),
): OpenStatus {
  const scopedHours = hours.filter((h) => h.zone_name === zoneName);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayDow = now.getDay();
  const yesterdayDow = (todayDow + 6) % 7;

  const today = scopedHours.find((h) => h.day_of_week === todayDow);
  const yesterday = scopedHours.find((h) => h.day_of_week === yesterdayDow);

  // Open via today's own row.
  if (today) {
    const openM = toMinutes(today.open_time);
    const closeM = toMinutes(today.close_time);
    if (withinRange(nowMinutes, openM, closeM)) {
      const closesInMinutes = closeM < openM ? closeM + 24 * 60 - nowMinutes : closeM - nowMinutes;
      return { open: true, closesInMinutes };
    }
  }

  // Open via yesterday's overnight row (see isOpenNow's own comment on why
  // an overnight schedule is stored under the day it started).
  if (yesterday) {
    const openM = toMinutes(yesterday.open_time);
    const closeM = toMinutes(yesterday.close_time);
    if (closeM < openM && nowMinutes < closeM) {
      return { open: true, closesInMinutes: closeM - nowMinutes };
    }
  }

  // Closed, but opens later today.
  if (today) {
    const openM = toMinutes(today.open_time);
    if (nowMinutes < openM) {
      return { open: false, opensInMinutes: openM - nowMinutes };
    }
  }

  // Closed, nothing left today — does it open tomorrow?
  const tomorrow = scopedHours.find((h) => h.day_of_week === (todayDow + 1) % 7);
  if (tomorrow) {
    const opensInMinutes = 24 * 60 - nowMinutes + toMinutes(tomorrow.open_time);
    return { open: false, opensInMinutes };
  }

  return { open: false, opensInMinutes: null };
}

// Above this, "soon" stops being useful as an urgency signal and just reads
// as a countdown nobody asked for — past it we fall back to the plain
// Ouvert/Fermé a status badge always had.
const CLOSING_SOON_THRESHOLD_MINUTES = 60;
const OPENING_SOON_THRESHOLD_MINUTES = 120;

function formatMinutesFromNow(minutes: number): string {
  if (minutes < 1) return "1 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.round(minutes / 60);
  return `${hours} h`;
}

/** Turns an OpenStatus into the label a badge actually shows — "Ferme dans
 * 20 min" / "Ouvre dans 1 h" close to a transition, otherwise the same
 * plain "Ouvert"/"Fermé" every call site already displayed. */
export function formatOpenStatus(status: OpenStatus): string {
  if (status.open) {
    if (status.closesInMinutes !== null && status.closesInMinutes <= CLOSING_SOON_THRESHOLD_MINUTES) {
      return `Ferme dans ${formatMinutesFromNow(status.closesInMinutes)}`;
    }
    return "Ouvert";
  }
  if (status.opensInMinutes !== null && status.opensInMinutes <= OPENING_SOON_THRESHOLD_MINUTES) {
    return `Ouvre dans ${formatMinutesFromNow(status.opensInMinutes)}`;
  }
  return "Fermé";
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
