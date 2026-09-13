// Shared "when" filter for events, used by the map's filter panel. A tagged
// union rather than a flat string enum specifically to carry the exact date
// someone picks — "today"/"weekend"/"week" need no extra data, but "date"
// does, and this keeps that data attached to the value itself instead of a
// second piece of state the caller has to keep in sync.
export type EventDateFilterValue =
  | { kind: "all" }
  | { kind: "today" }
  | { kind: "weekend" }
  | { kind: "week" }
  | { kind: "date"; date: string }; // "YYYY-MM-DD", a <input type="date"> value

export const ALL_EVENT_DATES: EventDateFilterValue = { kind: "all" };

// The one-tap reflex options — a real date/period picker (see "date" above)
// covers the rest without needing a fourth/fifth quick chip for every case.
export const EVENT_DATE_QUICK_OPTIONS: { kind: "today" | "weekend" | "week"; label: string }[] = [
  { kind: "today", label: "Aujourd'hui" },
  { kind: "weekend", label: "Ce week-end" },
  { kind: "week", label: "Cette semaine" },
];

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfLocalDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function matchesEventDateFilter(startDatetime: string, filter: EventDateFilterValue, now = new Date()): boolean {
  if (filter.kind === "all") return true;

  const start = new Date(startDatetime);
  if (filter.kind === "today") return isSameLocalDay(start, now);

  if (filter.kind === "date") {
    // Compared as a local calendar date, the same way the <input
    // type="date"> that produced this value is itself local — not a UTC
    // timestamp comparison, which could shift the matched day near
    // midnight depending on the visitor's timezone.
    const [year, month, day] = filter.date.split("-").map(Number);
    return start.getFullYear() === year && start.getMonth() + 1 === month && start.getDate() === day;
  }

  if (filter.kind === "week") {
    const todayStart = startOfLocalDay(now);
    const weekEnd = new Date(todayStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return start >= todayStart && start < weekEnd;
  }

  // "weekend": the *upcoming* Saturday/Sunday — if today is already Sat or
  // Sun, that's this weekend; otherwise the next one. Never a weekend that
  // has already fully passed.
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  const daysUntilSaturday = (6 - day + 7) % 7;
  const weekendStart = startOfLocalDay(now);
  weekendStart.setDate(weekendStart.getDate() + (day === 0 ? -1 : daysUntilSaturday));
  const weekendEnd = new Date(weekendStart);
  weekendEnd.setDate(weekendEnd.getDate() + 2); // exclusive end: Monday 00:00
  return start >= weekendStart && start < weekendEnd;
}
