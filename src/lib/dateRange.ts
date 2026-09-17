// Pure date-math for DateFilter's hand-rolled month-grid calendar — no
// dependency, this app has no date-picker library and a filter this small
// doesn't need one (same zero-dependency approach as PhotoCarousel's own
// hand-rolled swipe handling). Every date here is a *local* calendar day,
// keyed the same way a plain <input type="date"> would ("YYYY-MM-DD") —
// never a UTC instant — so a range picked in the browser's own timezone
// stays that same calendar day regardless of what timezone the server or
// database happen to be in.

export function startOfLocalDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** "YYYY-MM-DD" for a local calendar date — the same shape a plain
 * <input type="date"> produces/consumes, and what EventDateFilterValue's
 * "range" variant stores. */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The inverse of toDateKey — local midnight of that calendar date, never a
 * UTC-parsed `new Date("YYYY-MM-DD")` (which the spec treats as UTC
 * midnight and can land on the *previous* local day west of UTC). */
export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Pinned to the 1st before shifting months — adding a month straight to,
 * say, Jan 31 would otherwise skid into March (Feb only has 28/29 days). */
export function addMonths(d: Date, months: number): Date {
  const copy = new Date(d);
  copy.setDate(1);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

// Monday-first, matching the French convention this app's other date
// formatting already follows (see eventSchedule.ts's fr-FR formatters).
export const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

/** Every cell (42 = 6 weeks × 7 days, enough to always fully cover any
 * month regardless of which weekday it starts/ends on) of a Monday-first
 * month grid for `monthDate`'s month — includes the trailing days of the
 * previous month and the leading days of the next month needed to fill a
 * full grid, each tagged with whether it actually belongs to the displayed
 * month (so the caller can render adjacent-month days dimmed). */
export function monthGridDays(monthDate: Date): { date: Date; inMonth: boolean }[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  // getDay(): 0=Sunday..6=Saturday — converted to a Monday-first offset
  // (0=Monday..6=Sunday) so the grid's first column is always Monday.
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = addDays(firstOfMonth, -firstWeekday);

  return Array.from({ length: 42 }, (_, i) => {
    const date = addDays(gridStart, i);
    return { date, inMonth: date.getMonth() === month };
  });
}
