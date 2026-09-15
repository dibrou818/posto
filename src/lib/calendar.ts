import { DEFAULT_EVENT_DURATION_MINUTES } from "@/lib/eventSchedule";

/** Escapes a TEXT value per RFC 5545 §3.3.11 — commas, semicolons,
 * backslashes and newlines all need escaping inside an .ics field, or a
 * comma in a title/address would get parsed as a field separator. */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** `2026-09-10T14:30:00+00:00` -> `20260910T143000Z`, the UTC form every
 * DATE-TIME field in an .ics file needs. */
function formatIcsDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export type IcsEventData = {
  id: string;
  title: string;
  description: string | null;
  startDatetime: string;
  endDatetime: string | null;
  durationMinutes: number | null;
  placeName: string;
  placeAddress: string | null;
  pageUrl: string;
};

/** One-event .ics file as a `data:` URI — plain enough to hand straight to
 * an `<a download>`, no Blob/object-URL plumbing needed. Google Calendar,
 * Apple Calendar and Outlook all import this format directly. End time
 * falls back the same way `isEventHappeningNow` does: explicit end, else
 * start + typical duration, else a 2h default. */
export function buildEventIcsDataUrl(event: IcsEventData): string {
  const start = new Date(event.startDatetime);
  const end = event.endDatetime
    ? new Date(event.endDatetime)
    : new Date(start.getTime() + (event.durationMinutes ?? DEFAULT_EVENT_DURATION_MINUTES) * 60_000);
  const location = [event.placeName, event.placeAddress].filter(Boolean).join(", ");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Posto//FR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.id}@goposto.com`,
    `DTSTAMP:${formatIcsDateTime(new Date())}`,
    `DTSTART:${formatIcsDateTime(start)}`,
    `DTEND:${formatIcsDateTime(end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    ...(event.description ? [`DESCRIPTION:${escapeIcsText(event.description)}`] : []),
    ...(location ? [`LOCATION:${escapeIcsText(location)}`] : []),
    `URL:${event.pageUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
}

/** `Soirée Escape entre amis` -> `soiree-escape-entre-amis.ics` — a real
 * filename instead of the browser's generic "download" default. Strips
 * accents via a Unicode decomposition (NFD) + combining-mark removal
 * rather than a manual à/é/... map, so it isn't French-specific. */
export function icsFilename(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "evenement"}.ics`;
}
