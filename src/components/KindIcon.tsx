/** The one calendar/pin glyph Posto uses everywhere something is marked as
 * an event or a place — the home page's "Événements"/"Lieux" category
 * headings and every EventCard/PlaceCard's title row. Defined once, here,
 * so every usage is guaranteed to be the literal same icon instead of a
 * close-but-not-quite reimplementation drifting apart over time (which is
 * exactly what had happened: the card version and the heading version
 * used slightly different stroke widths and path coordinates before this).
 *
 * Plain `currentColor`, no fill, no background chip — every caller wraps
 * it in an element carrying the color (text-gray-900 at every current
 * call site, matching the heading text right next to it), rather than the
 * icon hardcoding one. */
export function CalendarKindIcon() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="13" height="12" rx="1.5" />
      <path d="M3.5 8.5h13" />
      <path d="M7 3.5v3M13 3.5v3" />
    </svg>
  );
}

export function PlaceKindIcon() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 18.5s-6-5.5-6-9.8a6 6 0 1 1 12 0c0 4.3-6 9.8-6 9.8Z" />
      <circle cx="10" cy="8.5" r="1.9" />
    </svg>
  );
}
