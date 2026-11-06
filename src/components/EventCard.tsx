import { ViewTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import type { EventWithPlace } from "@/lib/queries";
import { formatDistance } from "@/lib/distance";
import { formatEventDateBadge, formatPrice } from "@/lib/eventSchedule";
import { accessLabel } from "@/lib/access";
import { CalendarKindIcon } from "@/components/KindIcon";

export const CARD_IMAGE_SIZES = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 96px";

/** How a card lays itself out. "auto" is the default everywhere a list of
 * cards appears: a compact row on phones (square photo on the left, text on
 * the right — several fit one screen, one after the other), and the
 * image-first tile from `sm` up, where there's room for it. "tile" keeps the
 * image-first layout at every width, for horizontally scrolling rows. */
export type CardVariant = "auto" | "tile";

export function cardClasses(variant: CardVariant) {
  const tile = variant === "tile";
  return {
    link: `group block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/30 focus-visible:ring-offset-2 ${tile ? "rounded-3xl" : "sm:rounded-3xl"}`,
    layout: tile ? "" : "flex items-center gap-3.5 sm:block",
    photo: tile
      ? "relative aspect-[16/10] overflow-hidden rounded-3xl bg-gray-100"
      : "relative size-24 shrink-0 overflow-hidden rounded-2xl bg-gray-100 sm:aspect-[16/10] sm:size-auto sm:rounded-3xl",
    text: tile ? "mt-2.5 px-0.5" : "min-w-0 flex-1 sm:mt-2.5 sm:flex-none sm:px-0.5",
    // The line above the title (date / open state) sits in the text column on
    // a phone row, and as a chip over the photo in a tile.
    inlineMeta: tile ? "hidden" : "block sm:hidden",
    chip: tile ? "inline-flex" : "hidden sm:inline-flex",
    title: tile ? "line-clamp-1 text-base" : "line-clamp-2 text-base sm:line-clamp-1",
  };
}

/** Card for an upcoming event. The photo is a shared element: it morphs into
 * the hero of the event page. `morph={false}` is for a second list of the
 * same events on one screen (two elements can't share a transition name). */
export function EventCard({
  event,
  distanceKm,
  morph = true,
  variant = "auto",
}: {
  event: EventWithPlace;
  distanceKm?: number;
  morph?: boolean;
  variant?: CardVariant;
}) {
  const c = cardClasses(variant);
  const coverPhotoUrl = event.cover_photo_url ?? event.place.cover_photo_url;
  const priceLabel = formatPrice(event.price_cents, event.price_unit);
  const access = accessLabel(event.access);
  const meta = [event.place.name, distanceKm !== undefined ? formatDistance(distanceKm) : null].filter(Boolean);
  const practical = [priceLabel, access].filter(Boolean);
  const date = formatEventDateBadge(event.start_datetime);

  const photo = (
    <div className={c.photo}>
      {coverPhotoUrl ? (
        <Image
          src={coverPhotoUrl}
          alt=""
          fill
          sizes={variant === "tile" ? "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw" : CARD_IMAGE_SIZES}
          className="object-cover"
        />
      ) : (
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-gray-500 [&_svg]:h-6 [&_svg]:w-6">
          <CalendarKindIcon />
        </span>
      )}
      <span className={`${c.chip} absolute top-2 left-2 max-w-[calc(100%-1rem)] items-center rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-gray-900 tabular-nums shadow-sm sm:top-2.5 sm:left-2.5 sm:px-2.5 sm:py-1 sm:text-xs`}>
        {date}
      </span>
    </div>
  );

  return (
    <Link href={`/events/${event.id}`} className={c.link}>
      <div className={c.layout}>
        {morph ? (
          <ViewTransition name={`photo-event-${event.id}`} share="morph" default="none">
            {photo}
          </ViewTransition>
        ) : (
          photo
        )}
        <div className={c.text}>
          <p className={`${c.inlineMeta} truncate text-xs font-medium text-gray-900 tabular-nums`}>{date}</p>
          <h3 className={`${c.title} leading-snug font-semibold text-gray-900`}>{event.title}</h3>
          <p className="line-clamp-1 text-sm text-gray-600">{meta.join(" · ")}</p>
          {practical.length > 0 && <p className="line-clamp-1 text-xs text-gray-500 sm:text-sm">{practical.join(" · ")}</p>}
        </div>
      </div>
    </Link>
  );
}
