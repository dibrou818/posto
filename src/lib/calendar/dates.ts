import { DEFAULT_EVENT_DURATION_MINUTES } from "@/lib/eventSchedule";
import type { CalendarEventInput } from "./types";

/** Resolves the event's actual start/end instants — end falls back the same
 * way isEventHappeningNow does: explicit end, else start + typical
 * duration, else a 2h default. Every provider (Google/Outlook URLs, the
 * .ics file) needs this same window, so it's computed once here rather
 * than reimplemented per provider. */
export function resolveEventWindow(
  event: Pick<CalendarEventInput, "startDatetime" | "endDatetime" | "durationMinutes">,
): { start: Date; end: Date } {
  const start = new Date(event.startDatetime);
  const end = event.endDatetime
    ? new Date(event.endDatetime)
    : new Date(start.getTime() + (event.durationMinutes ?? DEFAULT_EVENT_DURATION_MINUTES) * 60_000);
  return { start, end };
}

/** `2026-09-27T17:00:00.000Z` -> `20260927T170000Z` — the DATE-TIME form
 * both the .ics file (RFC 5545) and Google's `dates=` query param want. */
export function toIcsDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/** `2026-09-27T17:00:00.000Z` -> `2026-09-27T17:00:00Z` — plain ISO 8601
 * with the milliseconds dropped, the form Outlook's deeplink expects. */
export function toIso8601Utc(date: Date): string {
  return date.toISOString().split(".")[0] + "Z";
}

/** "Highton – Bar à Fléchettes, 575 Rue Hegel, 59000 Lille" — venue name and
 * address joined into the one-line LOCATION every provider expects, with
 * the address omitted when a place hasn't filled it in rather than leaving
 * a trailing ", ". */
export function eventLocation(event: Pick<CalendarEventInput, "placeName" | "placeAddress">): string {
  return [event.placeName, event.placeAddress].filter(Boolean).join(", ");
}
