import Image from "next/image";
import Link from "next/link";
import type { PlaceWithRelations } from "@/lib/queries";
import { getOpenStatus } from "@/lib/opening-hours";
import { OpenStatusLabel } from "@/components/OpenStatusLabel";
import { ChevronRightIcon } from "@/components/ui/icons";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });

export type PlaceActivity = { upcomingCount: number; nextStart: string | null };

/** One place on the pro home, as a single tappable row: photo, name, live
 * status, what's coming up and what's still missing — the whole row opens
 * the place. */
export function DashboardPlaceCard({ place, activity }: { place: PlaceWithRelations; activity: PlaceActivity }) {
  const status = getOpenStatus(place.opening_hours);
  const hasHours = place.opening_hours.some((hour) => hour.zone_name === null);
  const urgentActive =
    Boolean(place.urgent_message) &&
    (!place.urgent_message_expires_at || new Date(place.urgent_message_expires_at) > new Date());

  const missing: string[] = [];
  if (!place.cover_photo_url) missing.push("photo");
  if (!place.description) missing.push("description");
  if (place.opening_hours.length === 0) missing.push("horaires");
  if (place.tags.length === 0) missing.push("catégories");

  const upcoming =
    activity.upcomingCount === 0
      ? "Aucun événement à venir"
      : `${activity.upcomingCount} événement${activity.upcomingCount > 1 ? "s" : ""} à venir${activity.nextStart ? ` · ${dateFormat.format(new Date(activity.nextStart))}` : ""}`;

  return (
    <li>
      <Link
        href={`/dashboard/places/${place.id}/informations`}
        className="-mx-3 flex items-center gap-4 rounded-xl px-3 py-4 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:bg-gray-50"
      >
        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
          {place.cover_photo_url && <Image src={place.cover_photo_url} alt="" fill sizes="56px" className="object-cover" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-gray-900">{place.name}</span>
          <span className="mt-0.5 flex min-w-0 items-center gap-2 text-sm text-gray-500">
            <OpenStatusLabel status={status} hasHours={hasHours} className="shrink-0" />
            {place.address && <span className="hidden truncate sm:inline">· {place.address}</span>}
          </span>
          {(missing.length > 0 || urgentActive) && (
            <span className="mt-1 block truncate text-sm text-gray-500">
              {urgentActive && <span className="font-medium text-amber-700">Message urgent en ligne</span>}
              {urgentActive && missing.length > 0 && " · "}
              {missing.length > 0 && `À compléter : ${missing.join(", ")}`}
            </span>
          )}
        </span>
        <span className="hidden shrink-0 text-right text-sm text-gray-500 tabular-nums md:block">{upcoming}</span>
        <ChevronRightIcon />
      </Link>
    </li>
  );
}
