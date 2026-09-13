import Image from "next/image";
import Link from "next/link";
import type { EventWithPlace } from "@/lib/queries";
import { formatDistance } from "@/lib/distance";
import { formatEventDateBadge } from "@/lib/eventSchedule";
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

  return (
    <Link
      href={`/events/${event.id}`}
      className={`flex gap-4 p-3 focus:outline-none focus:ring-2 focus:ring-gray-900/20 ${cardClass}`}
    >
      <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {coverPhotoUrl ? (
          <Image
            src={coverPhotoUrl}
            alt={event.title}
            fill
            sizes="128px"
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-semibold text-gray-900">{event.title}</h3>
            {event.price && (
              <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {event.price}
              </span>
            )}
          </div>
          <p className="truncate text-xs text-gray-500">{event.place.name}</p>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {formatEventDateBadge(event.start_datetime)}
          </span>
          {event.restrictions && <RestrictionsBadge text={event.restrictions} />}
          {distanceKm !== undefined && (
            <span className="ml-auto text-xs text-gray-500">{formatDistance(distanceKm)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
