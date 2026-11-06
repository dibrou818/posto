import { ViewTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import type { PlaceWithRelations } from "@/lib/queries";
import { getOpenStatus, formatOpenStatus, openStatusTone } from "@/lib/opening-hours";
import { OpenStatusLabel, STATUS_DOT } from "@/components/OpenStatusLabel";
import { formatDistance } from "@/lib/distance";
import { PlaceKindIcon } from "@/components/KindIcon";
import { CARD_IMAGE_SIZES, cardClasses, type CardVariant } from "@/components/EventCard";

/** Same layout rules as EventCard (compact row on phones, image-first tile
 * above), for a place: the live open/closed state takes the date's slot. */
export function PlaceCard({
  place,
  distanceKm,
  morph = true,
  variant = "auto",
}: {
  place: PlaceWithRelations;
  distanceKm?: number;
  morph?: boolean;
  variant?: CardVariant;
}) {
  const c = cardClasses(variant);
  const openStatus = getOpenStatus(place.opening_hours);
  const hasHours = place.opening_hours.some((hour) => hour.zone_name === null);
  const statusLabel = hasHours ? formatOpenStatus(openStatus) : "Horaires non renseignés";
  const dot = STATUS_DOT[openStatusTone(openStatus, hasHours)];
  const meta = [place.address, distanceKm !== undefined ? formatDistance(distanceKm) : null].filter(Boolean);

  const photo = (
    <div className={c.photo}>
      {place.cover_photo_url ? (
        <Image
          src={place.cover_photo_url}
          alt=""
          fill
          sizes={variant === "tile" ? "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw" : CARD_IMAGE_SIZES}
          className="object-cover"
        />
      ) : (
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-gray-400 [&_svg]:h-6 [&_svg]:w-6">
          <PlaceKindIcon />
        </span>
      )}
      <span className={`${c.chip} absolute top-2 left-2 max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-gray-900 tabular-nums shadow-sm sm:top-2.5 sm:left-2.5 sm:px-2.5 sm:py-1 sm:text-xs`}>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
        {statusLabel}
      </span>
    </div>
  );

  return (
    <Link href={`/places/${place.id}`} className={c.link}>
      <div className={c.layout}>
        {morph ? (
          <ViewTransition name={`photo-place-${place.id}`} share="morph" default="none">
            {photo}
          </ViewTransition>
        ) : (
          photo
        )}
        <div className={c.text}>
          <p className={`${c.inlineMeta} truncate text-xs`}>
            <OpenStatusLabel status={openStatus} hasHours={hasHours} />
          </p>
          <h3 className={`${c.title} leading-snug font-semibold text-gray-900`}>{place.name}</h3>
          <p className="line-clamp-1 text-sm text-gray-600">{meta.join(" · ")}</p>
          {place.tags.length > 0 && (
            <p className="line-clamp-1 text-xs text-gray-500 sm:text-sm">{place.tags.map((tag) => tag.label).join(" · ")}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
