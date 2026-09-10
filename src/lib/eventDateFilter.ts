// Shared "when" filter for events — used by the map's Événements filter
// (and anywhere else a quick date bucket makes sense) so "Aujourd'hui / Ce
// week-end / Cette semaine" means the same thing everywhere.
export type EventDateBucket = "all" | "today" | "weekend" | "week";

export const EVENT_DATE_BUCKET_OPTIONS: { value: EventDateBucket; label: string }[] = [
  { value: "all", label: "Toutes les dates" },
  { value: "today", label: "Aujourd'hui" },
  { value: "weekend", label: "Ce week-end" },
  { value: "week", label: "Cette semaine" },
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

export function matchesDateBucket(startDatetime: string, bucket: EventDateBucket, now = new Date()): boolean {
  if (bucket === "all") return true;

  const start = new Date(startDatetime);
  if (bucket === "today") return isSameLocalDay(start, now);

  if (bucket === "week") {
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
