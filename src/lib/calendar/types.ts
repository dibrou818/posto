/** Everything a calendar provider link/file needs — the same shape
 * regardless of destination (Google/Outlook URL params, or the .ics file
 * Apple/the universal fallback use). `pageUrl` must already be absolute
 * (see lib/site.ts's getSiteOrigin) since it ends up embedded in an email
 * client / calendar app, not rendered in a browser that could resolve a
 * relative one. */
export type CalendarEventInput = {
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
