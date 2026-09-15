const fullDate = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const shortDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
// Kept as two separate formatters (date, time) rather than one combined
// Intl.DateTimeFormat with both weekday/date and hour/minute fields —
// fr-FR's built-in combined format inserts a comma before the time
// ("sam. 19 sept., 14:30"), which reads as a formatting glitch in a small
// badge rather than a real date+time pair. Joining the two pieces with a
// plain space avoids that comma entirely.
const badgeDate = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const badgeTime = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** `2026-09-10T14:30:00+00:00` (DB) -> `2026-09-10T14:30` (the value a
 * `datetime-local` input needs) in the browser's own timezone. Shared by
 * every edit form with a date+time field (a place's urgent-message expiry,
 * an event's start/end). */
export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// Most events here are one evening that happens to run past midnight (bar
// closes at 1am) — treating that as two different "days" produced dates
// like "vendredi 11 septembre 2026 22:58 - samedi 12 septembre 2026 01:58",
// technically correct but unreadable. Anything within one 15h stretch reads
// as a single session instead: one date, one time range.
const SAME_SESSION_MAX_HOURS = 15;

/** One short, human line for an event's date + time — e.g.
 * "Vendredi 11 septembre · 22:58 – 01:58" or, for a real multi-day event,
 * "Du 11 sept. au 13 sept.". No year: events are always upcoming, so it
 * rarely adds information and only makes the line longer. */
export function formatEventSchedule(startIso: string, endIso: string | null): string {
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : null;

  if (!end) {
    return `${capitalize(fullDate.format(start))} · ${time.format(start)}`;
  }

  const durationHours = (end.getTime() - start.getTime()) / (60 * 60 * 1000);
  if (durationHours <= SAME_SESSION_MAX_HOURS) {
    return `${capitalize(fullDate.format(start))} · ${time.format(start)} – ${time.format(end)}`;
  }

  return `Du ${shortDate.format(start)} au ${shortDate.format(end)}`;
}

const WEEKDAY_FR: Record<string, string> = {
  monday: "lundi",
  tuesday: "mardi",
  wednesday: "mercredi",
  thursday: "jeudi",
  friday: "vendredi",
  saturday: "samedi",
  sunday: "dimanche",
};

/** Turns the stored rule ("weekly:thursday") into human French ("Tous les
 * jeudis"). Falls back to the raw value for any rule shape we don't
 * recognize, rather than hiding it — better an odd-looking label than a
 * silently dropped one. */
export function formatRecurrence(rule: string | null): string | null {
  if (!rule) return null;
  const [frequency, day] = rule.split(":");
  if (frequency === "weekly" && day && WEEKDAY_FR[day.toLowerCase()]) {
    return `Tous les ${WEEKDAY_FR[day.toLowerCase()]}s`;
  }
  return rule;
}

/** Compact "ven. 11 sept., 22:58"-style date+time for a small badge/pill —
 * shared by the map popups, the mobile bottom sheet, and the home page's
 * event cards, which all show the same compact stamp. */
export function formatEventDateBadge(iso: string): string {
  const date = new Date(iso);
  return `${badgeDate.format(date)} ${badgeTime.format(date)}`;
}

/** A typical/expected duration in minutes -> "20 min" or "1h30" — the same
 * short format people actually use, not a raw minute count past the hour
 * mark. Returns null for anything not worth showing (unset or non-positive). */
export function formatDuration(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, "0")}`;
}

// Used whenever an event has neither an explicit end time nor a typical
// duration set, and something still needs a concrete end instant — deciding
// whether it's happening right now, or how long to block on a calendar
// import. 2h is a reasonable generic guess for "one evening out", the same
// assumption formatEventSchedule's SAME_SESSION_MAX_HOURS is built around.
export const DEFAULT_EVENT_DURATION_MINUTES = 120;

/** Whether `now` falls inside the event's run — end is end_datetime if set,
 * else start + its typical duration, else the 2h default above. Used by the
 * "Ouvert maintenant" filter to also surface events currently in progress,
 * not just places. */
export function isEventHappeningNow(
  startIso: string,
  endIso: string | null,
  durationMinutes: number | null,
  now: Date = new Date(),
): boolean {
  const start = new Date(startIso);
  const end = endIso
    ? new Date(endIso)
    : new Date(start.getTime() + (durationMinutes ?? DEFAULT_EVENT_DURATION_MINUTES) * 60_000);
  return now >= start && now <= end;
}

const PRICE_UNIT_LABEL: Record<string, string> = {
  personne: "personne",
  equipe: "équipe",
  partie: "partie",
};

/** price_cents/price_unit -> "Gratuit" / "15 €" / "20 € / équipe" — the
 * same rendered shape the old free-text `price` column used to hold, now
 * derived from two structured columns instead of typed by hand. `cents`
 * null means "prix non précisé" (renders nothing, same as an empty old
 * `price`); 0 is an explicit "Gratuit", not "unset". */
export function formatPrice(cents: number | null, unit: string | null): string | null {
  if (cents === null) return null;
  if (cents === 0) return "Gratuit";
  const amount = cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace(".", ",");
  const unitLabel = unit ? PRICE_UNIT_LABEL[unit] : undefined;
  return unitLabel ? `${amount} € / ${unitLabel}` : `${amount} €`;
}
