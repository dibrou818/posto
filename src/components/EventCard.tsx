import Image from "next/image";
import Link from "next/link";
import type { EventWithPlace } from "@/lib/queries";
import { formatDistance } from "@/lib/distance";
import { formatEventDateBadge, formatPrice } from "@/lib/eventSchedule";
import { cardClass } from "@/lib/ui";
import { RestrictionsBadge } from "@/components/RestrictionsBadge";
import { CalendarKindIcon } from "@/components/KindIcon";

/** Grid card for an upcoming event — same visual language as PlaceCard
 * (horizontal, image left) so the two interleave cleanly on the home page. */
export function EventCard({
  event,
  distanceKm,
}: {
  event: EventWithPlace;
  distanceKm?: number;
}) {
  const coverPhotoUrl = event.cover_photo_url ?? event.place.cover_photo_url;
  const priceLabel = formatPrice(event.price_cents, event.price_unit);

  return (
    <Link
      href={`/events/${event.id}`}
      className={`flex gap-3.5 p-3 focus:outline-none focus:ring-2 focus:ring-gray-900/20 ${cardClass}`}
    >
      <div className="relative flex h-28 w-24 items-center justify-center shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {coverPhotoUrl ? (
          <Image
            src={coverPhotoUrl}
            alt=""
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : <span aria-hidden="true" className="text-gray-400"><CalendarKindIcon /></span>}
      </div>
      {/* min-w-0 here (not just on the row above) is what lets `truncate`
          on the title actually do its job: a flex item's default min-width
          is auto (= its content width), which is why this needs restating
          even though nothing in this column fights it for width anymore. */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="min-w-0">
          {/* The title used to share its line with the price pill — on a
              narrow card that's the one piece of information that matters
              most, so it now gets the full first line to itself; price
              moved down into the badge row (see below). The kind icon
              sits right before it on that same line, not on the photo —
              the exact same CalendarKindIcon the "Événements" section
              heading uses (see KindIcon.tsx), same gray-900 as the title
              text right after it, not a separate color/reimplementation.
              aria-hidden: decorative, the card's own content (date badge,
              place name) already says what it is. */}
          <div className="flex min-w-0 items-center gap-1.5">
            <span aria-hidden="true" className="shrink-0 text-gray-900">
              <CalendarKindIcon />
            </span>
            <h3 className="min-w-0 line-clamp-2 text-base leading-snug font-semibold text-gray-900">{event.title}</h3>
          </div>
          <p className="line-clamp-2 text-sm text-gray-600">{event.place.name}</p>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {/* shrink-0 + whitespace-nowrap: this pill is one line of text —
              without them the flex row squeezed it down to zero width and
              wrapped "sam. 19 sept. 14:30" onto two lines inside the pill
              itself, instead of just moving the whole pill to its own row
              (which flex-wrap on the parent already does when needed). */}
          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs whitespace-nowrap text-gray-600">
            {formatEventDateBadge(event.start_datetime)}
          </span>
          {event.restrictions && <RestrictionsBadge text={event.restrictions} />}
          {/* Distance and price grouped together so whichever is present
              (or both) end up in the bottom-right corner of the card,
              instead of each independently claiming ml-auto. */}
          {(distanceKm !== undefined || priceLabel) && (
            <span className="ml-auto flex shrink-0 items-center gap-1.5">
              {distanceKm !== undefined && (
                <span className="text-xs whitespace-nowrap text-gray-500">{formatDistance(distanceKm)}</span>
              )}
              {priceLabel && (
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-gray-600">
                  {priceLabel}
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
