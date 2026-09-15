import Image from "next/image";
import Link from "next/link";
import type { PlaceWithRelations } from "@/lib/queries";
import { isOpenNow } from "@/lib/opening-hours";
import { formatDistance } from "@/lib/distance";
import { cardClass } from "@/lib/ui";
import { PlaceKindIcon } from "@/components/KindIcon";

export function PlaceCard({
  place,
  distanceKm,
}: {
  place: PlaceWithRelations;
  distanceKm?: number;
}) {
  const open = isOpenNow(place.opening_hours);

  return (
    <Link
      href={`/places/${place.id}`}
      className={`flex gap-3 p-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900/20 ${cardClass}`}
    >
      <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {place.cover_photo_url ? (
          <Image
            src={place.cover_photo_url}
            alt={place.name}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : null}
      </div>
      {/* min-w-0 on the row below (not just here) is what lets `truncate`
          on the title actually shrink instead of overflowing — see
          EventCard, which has the same fix for the same reason. */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="min-w-0">
          {/* The title used to share its line with the Ouvert/Fermé status —
              same fix as EventCard's title/price: it now gets the full
              first line, and the status moves down into the badge row,
              grouped with distance in the bottom-right corner. The kind
              icon sits right before it on that same line, not on the
              photo — the exact same PlaceKindIcon the "Lieux" section
              heading uses (see KindIcon.tsx), same gray-900 as the title
              text right after it. aria-hidden: decorative, the card's own
              content (address, Ouvert/Fermé) already says what it is. */}
          <div className="flex min-w-0 items-center gap-1.5">
            <span aria-hidden="true" className="shrink-0 text-gray-900">
              <PlaceKindIcon />
            </span>
            <h3 className="min-w-0 truncate font-semibold text-gray-900">{place.name}</h3>
          </div>
          <p className="truncate text-xs text-gray-500">{place.address}</p>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {place.tags.map((tag) => (
            <span
              key={tag.id}
              className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs whitespace-nowrap text-gray-600"
            >
              {tag.label}
            </span>
          ))}
          <span className="ml-auto flex shrink-0 items-center gap-1.5">
            {distanceKm !== undefined && (
              <span className="text-xs whitespace-nowrap text-gray-500">{formatDistance(distanceKm)}</span>
            )}
            <span
              className={`shrink-0 text-xs font-medium whitespace-nowrap ${open ? "text-green-600" : "text-red-500"}`}
            >
              {open ? "Ouvert" : "Fermé"}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
