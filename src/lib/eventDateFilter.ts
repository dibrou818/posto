import { startOfLocalDay, fromDateKey } from "@/lib/dateRange";

// Shared "when" filter for events — the same DateFilter component (see
// components/DateFilter.tsx) and this same matching logic now drive both
// the home page's browse grid and the map's marker list, so "Cette
// semaine" (or any other option) means the literal same thing wherever
// it's picked, computed once instead of twice.
//
// A tagged union rather than a flat string enum specifically to carry the
// exact range someone picks — "today"/"tomorrow"/"weekend"/"week" need no
// extra data, but a hand-picked range does, and this keeps that data
// attached to the value itself instead of a second piece of state the
// caller has to keep in sync.
export type EventDateFilterValue =
  | { kind: "all" }
  | { kind: "today" }
  | { kind: "tomorrow" }
  | { kind: "weekend" }
  | { kind: "week" }
  // "YYYY-MM-DD", both inclusive, local calendar days (see dateRange.ts) —
  // a single chosen day is just start === end, not a separate variant.
  | { kind: "range"; start: string; end: string };

export const ALL_EVENT_DATES: EventDateFilterValue = { kind: "all" };

// The one-tap reflex options — "Date précise" (a real range picker, see
// DateFilter.tsx) covers everything else without needing a chip for every
// possible case.
export const EVENT_DATE_QUICK_OPTIONS: { kind: "today" | "tomorrow" | "weekend" | "week"; label: string }[] = [
  { kind: "today", label: "Aujourd'hui" },
  { kind: "tomorrow", label: "Demain" },
  { kind: "weekend", label: "Ce week-end" },
  { kind: "week", label: "Cette semaine" },
];

const shortDateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

/** What a FilterChip button should show for the currently active value —
 * a quick option's own label, a formatted single date, or a formatted
 * range ("12 sept. – 15 sept."). */
export function formatEventDateFilterLabel(filter: EventDateFilterValue): string {
  if (filter.kind === "all") return "Date";
  if (filter.kind === "range") {
    const start = shortDateFormatter.format(fromDateKey(filter.start));
    if (filter.start === filter.end) return start;
    return `${start} – ${shortDateFormatter.format(fromDateKey(filter.end))}`;
  }
  return EVENT_DATE_QUICK_OPTIONS.find((o) => o.kind === filter.kind)?.label ?? "Date";
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// The weekend "starts" Friday evening, not Friday at midnight — a 15:00
// Friday-afternoon talk isn't "the weekend" yet, but an 18:00 one already
// reads as one. This is also the threshold that decides whether "ce
// week-end" means the one ahead or the one already under way.
const WEEKEND_START_HOUR = 18;

function isWithinCurrentWeekend(now: Date): boolean {
  const day = now.getDay(); // 0=Sunday..6=Saturday
  if (day === 6 || day === 0) return true; // Saturday or Sunday
  return day === 5 && now.getHours() >= WEEKEND_START_HOUR; // Friday, evening
}

/** Friday 18:00 → Sunday 23:59:59.999 of the *relevant* weekend — the one
 * ahead (Monday through Friday-before-the-evening-threshold) or the one
 * currently under way (from that threshold through Sunday night). Never a
 * weekend that has already fully finished — a Sunday-morning visitor still
 * sees the weekend they're currently in, not next week's. */
function weekendRange(now: Date): { start: Date; end: Date } {
  const day = now.getDay();
  const fridayOffsetDays = isWithinCurrentWeekend(now)
    ? -((day - 5 + 7) % 7) // this week's Friday: today or in the past
    : (5 - day + 7) % 7; // this week's Friday: today (before 18:00) or ahead

  const start = startOfLocalDay(now);
  start.setDate(start.getDate() + fridayOffsetDays);
  start.setHours(WEEKEND_START_HOUR, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 2); // Friday -> Sunday
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function matchesEventDateFilter(
  startDatetime: string,
  filter: EventDateFilterValue,
  now = new Date(),
): boolean {
  if (filter.kind === "all") return true;

  const start = new Date(startDatetime);

  if (filter.kind === "today") return isSameLocalDay(start, now);

  if (filter.kind === "tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return isSameLocalDay(start, tomorrow);
  }

  if (filter.kind === "range") {
    const rangeStart = fromDateKey(filter.start); // local midnight
    const rangeEnd = fromDateKey(filter.end);
    rangeEnd.setHours(23, 59, 59, 999); // inclusive through the end of that day
    return start >= rangeStart && start <= rangeEnd;
  }

  if (filter.kind === "week") {
    // J+7 from the exact present moment, not from local midnight — "dans
    // les 7 prochains jours à partir du moment présent", not "d'ici la fin
    // du 7ᵉ jour calendaire".
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return start >= now && start <= weekEnd;
  }

  // "weekend"
  const { start: weekendStart, end: weekendEnd } = weekendRange(now);
  return start >= weekendStart && start <= weekendEnd;
}
