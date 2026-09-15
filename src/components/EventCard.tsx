import Image from "next/image";
import Link from "next/link";
import type { EventWithPlace } from "@/lib/queries";
import { formatDistance } from "@/lib/distance";
import { formatEventDateBadge, formatPrice } from "@/lib/eventSchedule";
import { cardClass } from "@/lib/ui";
import { RestrictionsBadge } from "@/components/RestrictionsBadge";

// A calendar for an event, a pin for a place (see PlaceCard's own
// PlaceKindIcon) — same blue, no background chip, sitting right before the
// title instead of on the photo: the two need to read as different kinds of
// card in a mixed "Tout" feed, but a colored circle stamped on every photo
// read as decoration for its own sake rather than information. aria-hidden:
// decorative, the card's own content (date badge here, address on a place)
// already says what it is.
function EventKindIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      width="15"
      height="15"
      className="shrink-0 text-blue-600"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="4.5" width="13" height="12" rx="1.5" />
      <path d="M3.5 8.5h13" />
      <path d="M7 3v3M13 3v3" />
    </svg>
  );
}

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
          is auto (= its content width), which is why this needs restating
          even though nothing in this column fights it for width anymore. */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="min-w-0">
          {/* The title used to share its line with the price pill — on a
              narrow card that's the one piece of information that matters
              most, so it now gets the full first line to itself; price
              moved down into the badge row (see below). The kind icon
              sits right before it on that same line, not on the photo —
              see EventKindIcon. */}
          <div className="flex min-w-0 items-center gap-1.5">
            <EventKindIcon />
            <h3 className="min-w-0 truncate font-semibold text-gray-900">{event.title}</h3>
          </div>
          <p className="truncate text-xs text-gray-500">{event.place.name}</p>
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
