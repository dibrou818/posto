import * as maplibregl from "maplibre-gl";
import { calendarIconSvgMarkup, placeIconSvgMarkup } from "@/components/KindIcon";

// Renders the exact same glyphs the home page uses (CalendarKindIcon/
// PlaceKindIcon in KindIcon.tsx) as MapLibre icon images, so a marker on the
// map and a card on the home page read as the same visual language instead
// of "a color-coded dot here, a calendar/pin glyph there" — two ways of
// saying the same thing that used to force a second glance (or the popup)
// to tell a place pin from an event pin apart.
//
// MapLibre's icon-image can only reference a raster registered via
// map.addImage — there's no way to hand it live SVG/DOM — so each glyph is
// rasterized once per map instance: draw the shared SVG markup (white, so
// it reads against the colored core circle underneath it, same as that
// circle's own white ring stroke) onto an offscreen canvas at a higher
// pixel density for a crisp look on retina screens, then hand MapLibre the
// resulting bitmap with a matching pixelRatio so it renders at the intended
// CSS size regardless of that density.
const ICON_SIZE = 14; // same on-screen size as the home page's KindIcon
const PIXEL_RATIO = 3;

function rasterizeSvg(markup: string): Promise<ImageData> {
  // A data: URI, not a blob: one — this app's CSP img-src allowlist (see
  // next.config.ts) admits `data:` but not `blob:`, and there's no reason
  // to widen the CSP just for an image this code generates itself entirely
  // client-side from a fixed, trusted string.
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = ICON_SIZE * PIXEL_RATIO;
      canvas.height = ICON_SIZE * PIXEL_RATIO;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("2d canvas context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
    };
    img.onerror = () => reject(new Error("Failed to rasterize marker icon"));
    img.src = url;
  });
}

export const PLACE_ICON_ID = "posto-place-icon";
export const EVENT_ICON_ID = "posto-event-icon";

/** Registers both marker glyphs on this map instance — call once per map,
 * before adding any symbol layer that references PLACE_ICON_ID/
 * EVENT_ICON_ID. Failure (e.g. canvas unavailable) rejects rather than
 * silently no-ops: callers should let markers render without the glyph
 * (a colored dot, same as before this feature) rather than block on it —
 * MapLibre itself already tolerates a symbol layer whose icon-image id
 * isn't registered, it just skips drawing that part. */
export async function registerMarkerIcons(map: maplibregl.Map) {
  const [placeIcon, eventIcon] = await Promise.all([
    rasterizeSvg(placeIconSvgMarkup("#ffffff")),
    rasterizeSvg(calendarIconSvgMarkup("#ffffff")),
  ]);
  if (!map.hasImage(PLACE_ICON_ID)) map.addImage(PLACE_ICON_ID, placeIcon, { pixelRatio: PIXEL_RATIO });
  if (!map.hasImage(EVENT_ICON_ID)) map.addImage(EVENT_ICON_ID, eventIcon, { pixelRatio: PIXEL_RATIO });
}
