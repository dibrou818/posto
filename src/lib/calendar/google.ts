import { resolveEventWindow, toIcsDateTime, eventLocation } from "./dates";
import type { CalendarEventInput } from "./types";

/** Google's own documented "quick add" URL (calendar.google.com/calendar/
 * render?action=TEMPLATE) — no Google API, no OAuth, no Posto-side account
 * connection: it just opens Google Calendar (web or the installed app, if
 * the OS hands it the link) with the event pre-filled, and the *user's*
 * own Google session (or lack of one) decides what happens next. Same
 * `dates=` format Google's docs specify: two toIcsDateTime values joined
 * by "/". Description doesn't have a separate "source URL" field the way
 * .ics has URL:, so the Posto link is appended to the details text
 * instead — still one tap to follow, just not a distinct field. */
export function buildGoogleCalendarUrl(event: CalendarEventInput): string {
  const { start, end } = resolveEventWindow(event);
  const details = [event.description, event.pageUrl].filter(Boolean).join("\n\n");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toIcsDateTime(start)}/${toIcsDateTime(end)}`,
    details,
    location: eventLocation(event),
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
