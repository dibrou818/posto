import Image from "next/image";
import Link from "next/link";
import type { PlaceWithRelations } from "@/lib/queries";
import { getOpenStatus } from "@/lib/opening-hours";
import { OpenStatusLabel } from "@/components/OpenStatusLabel";
import { LinkButton } from "@/components/ui/LinkButton";
import { PlusIcon } from "@/components/ui/PlusIcon";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });

export type PlaceActivity = { upcomingCount: number; nextStart: string | null };

/** One place on the pro home: what's going on (open now, events coming up,
 * a live urgent message) and what's still missing, each linking straight to
 * the section that fixes it — the whole card opens the place's management,
 * with the public page as a clearly separate secondary action. */
export function DashboardPlaceCard({ place, activity }: { place: PlaceWithRelations; activity: PlaceActivity }) {
  const base = `/dashboard/places/${place.id}`;
  const status = getOpenStatus(place.opening_hours);
  const urgentActive =
    Boolean(place.urgent_message) &&
    (!place.urgent_message_expires_at || new Date(place.urgent_message_expires_at) > new Date());

  const todo: { label: string; href: string }[] = [];
  if (!place.cover_photo_url) todo.push({ label: "Ajouter une photo", href: `${base}/informations` });
  if (!place.description) todo.push({ label: "Ajouter une description", href: `${base}/informations` });
  if (place.opening_hours.length === 0) todo.push({ label: "Renseigner les horaires", href: `${base}/horaires` });
  if (place.tags.length === 0) todo.push({ label: "Choisir des catégories", href: `${base}/informations` });

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
          {place.cover_photo_url && <Image src={place.cover_photo_url} alt="" fill sizes="64px" className="object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <Link href={`${base}/informations`} className="block truncate text-base font-medium text-gray-900 hover:underline focus:outline-none focus-visible:underline">
            {place.name}
          </Link>
          <p className="truncate text-sm text-gray-500">{place.address}</p>
          <p className="mt-1 text-sm">
            <OpenStatusLabel status={status} hasHours={place.opening_hours.some((hour) => hour.zone_name === null)} />
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
        <Link href={`${base}/evenements`} className="underline-offset-4 hover:underline">
          {activity.upcomingCount === 0
            ? "Aucun événement à venir"
            : `${activity.upcomingCount} événement${activity.upcomingCount > 1 ? "s" : ""} à venir${activity.nextStart ? ` · prochain ${dateFormat.format(new Date(activity.nextStart))}` : ""}`}
        </Link>
        {urgentActive && (
          <Link href={`${base}/informations#urgent`} className="font-medium text-amber-700 underline-offset-4 hover:underline">
            Message urgent actif
          </Link>
        )}
      </div>

      {todo.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {todo.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-gray-50 px-3 text-sm text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <PlusIcon />
              {item.label}
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
        <LinkButton href={`${base}/informations`} variant="solid">
          Gérer ce lieu
        </LinkButton>
        <LinkButton href={`/places/${place.id}`} icon="external">
          Voir la fiche
        </LinkButton>
      </div>
    </li>
  );
}
