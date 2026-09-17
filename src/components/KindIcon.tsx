/** The one calendar/pin glyph Posto uses everywhere something is marked as
 * an event or a place — the home page's "Événements"/"Lieux" category
 * headings, every EventCard/PlaceCard's title row, and the /map explorer's
 * own markers (see lib/mapMarkerIcons.ts). Defined once, here, so every
 * usage is guaranteed to be the literal same icon instead of a
 * close-but-not-quite reimplementation drifting apart over time (which is
 * exactly what had happened: the card version and the heading version
 * used slightly different stroke widths and path coordinates before this).
 *
 * The actual shapes live in the two *_ICON_MARKUP strings below — plain SVG
 * child markup, not JSX — so the React components and mapMarkerIcons.ts's
 * canvas rasterizer (which needs a standalone `<svg>...</svg>` string to
 * hand MapLibre, not a React element) both render from the exact same
 * source instead of two hand-kept-in-sync copies of the same path data. */
const CALENDAR_ICON_MARKUP =
  '<rect x="3.5" y="5" width="13" height="12" rx="1.5" /><path d="M3.5 8.5h13" /><path d="M7 3.5v3M13 3.5v3" />';
const PLACE_ICON_MARKUP =
  '<path d="M10 18.5s-6-5.5-6-9.8a6 6 0 1 1 12 0c0 4.3-6 9.8-6 9.8Z" /><circle cx="10" cy="8.5" r="1.9" />';

/** Plain `currentColor`, no fill, no background chip — every caller wraps
 * it in an element carrying the color (text-gray-900 at every current
 * call site, matching the heading text right next to it), rather than the
 * icon hardcoding one. */
export function CalendarKindIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: CALENDAR_ICON_MARKUP }}
    />
  );
}

export function PlaceKindIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: PLACE_ICON_MARKUP }}
    />
  );
}

/** Standalone SVG document strings (not JSX) for mapMarkerIcons.ts to
 * rasterize onto a canvas — MapLibre's icon-image needs a real bitmap, there
 * is no way to hand it a live SVG/DOM element, so this is the one place that
 * needs the markup as a string with a concrete stroke color baked in rather
 * than `currentColor`. */
export function calendarIconSvgMarkup(strokeColor: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${CALENDAR_ICON_MARKUP}</svg>`;
}

export function placeIconSvgMarkup(strokeColor: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${PLACE_ICON_MARKUP}</svg>`;
}
