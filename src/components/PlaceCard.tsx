import Image from "next/image";
import Link from "next/link";
import type { PlaceWithRelations } from "@/lib/queries";
import { isOpenNow } from "@/lib/opening-hours";
import { formatDistance } from "@/lib/distance";
import { cardClass } from "@/lib/ui";

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
      className={`flex gap-4 p-3 focus:outline-none focus:ring-2 focus:ring-gray-900/20 ${cardClass}`}
    >
      <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        {place.cover_photo_url ? (
          <Image
            src={place.cover_photo_url}
            alt={place.name}
            fill
            sizes="128px"
            className="object-cover"
          />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-semibold text-gray-900">{place.name}</h3>
            <span
              className={`shrink-0 text-xs font-medium ${open ? "text-green-600" : "text-red-500"}`}
            >
              {open ? "Ouvert" : "Fermé"}
            </span>
          </div>
          <p className="truncate text-xs text-gray-500">{place.address}</p>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {place.tags.map((tag) => (
            <span
              key={tag.id}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
            >
              {tag.label}
            </span>
          ))}
          {distanceKm !== undefined && (
            <span className="ml-auto text-xs text-gray-500">{formatDistance(distanceKm)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
