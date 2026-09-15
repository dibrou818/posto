import { resolveEventWindow, toIcsDateTime, eventLocation } from "./dates";
import type { CalendarEventInput } from "./types";

/** Escapes a TEXT value per RFC 5545 §3.3.11 — commas, semicolons,
 * backslashes and newlines all need escaping inside an .ics field, or a
 * comma in a title/address would get parsed as a field separator. UTF-8
 * accented characters (é, à, …) need no escaping of their own — RFC 5545
 * text is UTF-8 by default, only these five ASCII characters are special. */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** The raw .ics file content (CRLF line endings, per RFC 5545) — used both
 * by the download link's data: URI (short events, most browsers) and the
 * calendar.ics route handler (the reliable path — see that route for why
 * both exist). Google Calendar, Apple Calendar and Outlook all import this
 * format directly, so it's also the universal "Autre / .ics" fallback. */
export function buildIcsContent(event: CalendarEventInput): string {
  const { start, end } = resolveEventWindow(event);
  const location = eventLocation(event);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Posto//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@goposto.com`,
    `DTSTAMP:${toIcsDateTime(new Date())}`,
    `DTSTART:${toIcsDateTime(start)}`,
    `DTEND:${toIcsDateTime(end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    ...(event.description ? [`DESCRIPTION:${escapeIcsText(event.description)}`] : []),
    ...(location ? [`LOCATION:${escapeIcsText(location)}`] : []),
    `URL:${event.pageUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}

/** `Soirée Escape entre amis` -> `soiree-escape-entre-amis.ics` — a real
 * filename instead of the browser's generic "download" default. Strips
 * accents via a Unicode decomposition (NFD) + combining-mark removal
 * rather than a manual à/é/… map, so it isn't French-specific. */
export function icsFilename(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "evenement"}.ics`;
}
