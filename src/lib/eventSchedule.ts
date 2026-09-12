const fullDate = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const shortDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
