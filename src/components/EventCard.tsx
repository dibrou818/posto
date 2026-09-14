import Image from "next/image";
import Link from "next/link";
import type { EventWithPlace } from "@/lib/queries";
import { formatDistance } from "@/lib/distance";
import { formatEventDateBadge, formatPrice } from "@/lib/eventSchedule";
import { cardClass } from "@/lib/ui";
import { RestrictionsBadge } from "@/components/RestrictionsBadge";

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
      className={`flex gap-3 p-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900/20 ${cardClass}`}
    >
      <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {coverPhotoUrl ? (
          <Image
            src={coverPhotoUrl}
            alt={event.title}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : null}
      </div>
      {/* min-w-0 here (not just on the row above) is what lets `truncate`
          on the title actually do its job: a flex item's default min-width
          is auto (= its content width), so without this the title refused
          to shrink below "Tournoi de fléchettes" and — squeezed against the
          price pill's shrink-0 — rendered clipped down to a single letter
          instead of a clean ellipsis. */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 truncate font-semibold text-gray-900">{event.title}</h3>
            {priceLabel && (
              <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-gray-600">
                {priceLabel}
              </span>
            )}
          </div>
          <p className="truncate text-xs text-gray-500">{event.place.name}</p>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {/* shrink-0 + whitespace-nowrap: this pill is one line of text —
              without them the flex row squeezed it down to zero width and
              wrapped "mer. 23 sept., 14:30" onto two lines inside the pill
              itself, instead of just moving the whole pill to its own row
              (which flex-wrap on the parent already does when needed). */}
          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs whitespace-nowrap text-gray-600">
            {formatEventDateBadge(event.start_datetime)}
          </span>
          {event.restrictions && <RestrictionsBadge text={event.restrictions} />}
          {distanceKm !== undefined && (
            <span className="ml-auto shrink-0 text-xs whitespace-nowrap text-gray-500">{formatDistance(distanceKm)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
