import { createRoot, type Root } from "react-dom/client";
import type { PlaceWithRelations, EventWithPlace } from "@/lib/queries";
import { getOpenStatus, formatOpenStatus } from "@/lib/opening-hours";
import { formatEventDateBadge } from "@/lib/eventSchedule";
import { popupBodyHtml, CALENDAR_ICON_SVG, EVENT_COLOR } from "@/lib/mapPopups";
import { PhotoCarousel } from "@/components/PhotoCarousel";
import { placePhotos } from "@/lib/photos";

// Builds a map popup's actual DOM node (for Popup#setDOMContent, not
// #setHTML) — the photo area is a *mounted* PhotoCarousel, the exact same
// component the place/event page itself uses, so a lieu with several photos
// gets the same swipe/arrow navigation in its popup as it does on its full
// page instead of a plain, single, non-interactive <img>. Everything below
// the photo (title, address/place name, status/date badge, CTA link) stays
// the cheap string template from mapPopups.ts — none of that needs React.

const POPUP_WIDTH = 208;
// Same aspect the old single-<img> popup used (208×92) — kept identical so
// this doesn't also change the popup's overall size/shape, just what's
// interactive inside it.
const PHOTO_HEIGHT = 92;

function photoBoxElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `position:relative;width:100%;height:${PHOTO_HEIGHT}px;background:#e5e7eb;overflow:hidden;`;
  return el;
}

export type PopupContent = {
  /** Hand this straight to `Popup#setDOMContent`. */
  element: HTMLElement;
  /** Call once the popup that owns this content closes — unmounts the
   * PhotoCarousel's React root so its effects (next/image's own
   * IntersectionObserver included) clean up instead of being silently
   * discarded along with a DOM node React no longer knows was removed. */
  destroy: () => void;
};

function buildPopup(opts: {
  photos: string[];
  title: string;
  subtitle: string;
  badge: { label: string; bg: string; fg: string; dot?: string; icon?: string };
  href: string;
  cta: string;
}): PopupContent {
  const container = document.createElement("div");
  container.style.width = `${POPUP_WIDTH}px`;

  let root: Root | null = null;
  if (opts.photos.length > 0) {
    const photoBox = photoBoxElement();
    container.appendChild(photoBox);
    root = createRoot(photoBox);
    // sizes="208px": the popup's real on-screen width, not the full page's
    // 768px default — requesting a 768px-wide image for a 208px box would
    // still render correctly, just waste bandwidth. imagePriority={false}:
    // a popup opens well after the page's own LCP has already settled, so
    // its photo should never compete for the browser's priority fetch slot
    // the way the place/event page's own hero photo does.
    root.render(<PhotoCarousel photos={opts.photos} alt={opts.title} sizes="208px" imagePriority={false} />);
  }

  const body = document.createElement("div");
  body.innerHTML = popupBodyHtml(opts);
  container.appendChild(body);

  return { element: container, destroy: () => root?.unmount() };
}

export function placePopupContent(place: PlaceWithRelations): PopupContent {
  const status = getOpenStatus(place.opening_hours);
  return buildPopup({
    photos: placePhotos(place),
    title: place.name,
    subtitle: place.address ?? "",
    badge: status.open
      ? { label: formatOpenStatus(status), bg: "#dcfce7", fg: "#166534", dot: "#22c55e" }
      : { label: formatOpenStatus(status), bg: "#fee2e2", fg: "#991b1b", dot: "#ef4444" },
    href: `/places/${place.id}`,
    cta: "Voir la fiche",
  });
}

export function eventPopupContent(event: EventWithPlace): PopupContent {
  // Events have no gallery of their own in the data model (unlike places'
  // cover + photo_urls) — just the one cover photo, falling back to the
  // venue's. So this is a single-photo (or zero-photo) list today, and
  // PhotoCarousel already renders that correctly with no arrows/dots to
  // navigate; the moment events gain their own gallery, this popup picks up
  // the same swipe navigation for free, with no further change needed here.
  const coverPhotoUrl = event.cover_photo_url ?? event.place.cover_photo_url;
  return buildPopup({
    photos: coverPhotoUrl ? [coverPhotoUrl] : [],
    title: event.title,
    subtitle: event.place.name,
    badge: {
      label: formatEventDateBadge(event.start_datetime),
      bg: "#ede9fe",
      fg: EVENT_COLOR,
      icon: CALENDAR_ICON_SVG,
    },
    href: `/events/${event.id}`,
    cta: "Voir l'événement",
  });
}
