import { resolveEventWindow, toIso8601Utc, eventLocation } from "./dates";
import type { CalendarEventInput } from "./types";

/** Outlook's own documented web "deeplink/compose" URL — same reasoning as
 * Google's: no Microsoft Graph API, no OAuth, no Posto-side connection.
 * Targets outlook.live.com specifically (personal Microsoft/Outlook.com
 * accounts) rather than outlook.office.com — a work/school Microsoft 365
 * account on a company domain may not land on the same compose screen from
 * this link; that's a real, acknowledged limitation of the web-only
 * approach (see the calendar feature's own README-style notes), not
 * something fixable without asking which tenant the user belongs to. */
export function buildOutlookCalendarUrl(event: CalendarEventInput): string {
  const { start, end } = resolveEventWindow(event);
  const body = [event.description, event.pageUrl].filter(Boolean).join("\n\n");

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    startdt: toIso8601Utc(start),
    enddt: toIso8601Utc(end),
    subject: event.title,
    location: eventLocation(event),
    body,
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
