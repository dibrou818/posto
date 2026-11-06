import Link from "next/link";
import { getOwnedPlaces } from "@/lib/dashboardPlace";
import { DashboardPlaceCard, type PlaceActivity } from "@/components/dashboard/DashboardPlaceCard";
import { getEventStatus } from "@/lib/dashboardEventStatus";
import { getOpenStatus } from "@/lib/opening-hours";
import { buttonClass } from "@/lib/ui";
import { PlusIcon } from "@/components/ui/PlusIcon";

const timeFormat = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function Figure({ value, total, label }: { value: number; total?: number; label: string }) {
  return (
    <div className="px-4 py-3 first:pl-0 sm:px-6">
      <p className="posto-heading text-2xl text-gray-900 tabular-nums">
        {value}
        {total !== undefined && <span className="text-base font-normal text-gray-500">/{total}</span>}
      </p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const { supabase, places } = await getOwnedPlaces();
  const now = new Date();

  // One query for the events of every place, grouped here: what's still to
  // come per place, when the next one is, and what happens today.
  const activity = new Map<string, PlaceActivity>();
  const today: { id: string; placeId: string; title: string; start: Date; live: boolean }[] = [];
  if (places.length > 0) {
    const { data: events } = await supabase
      .from("events")
      .select("id, title, place_id, start_datetime, end_datetime, duration_minutes, recurrence_rule")
      .in("place_id", places.map((place) => place.id));
    for (const event of events ?? []) {
      const status = getEventStatus(event, now);
      if (status.key === "past") continue;
      const entry = activity.get(event.place_id) ?? { upcomingCount: 0, nextStart: null };
      entry.upcomingCount += 1;
      if (!event.recurrence_rule && (!entry.nextStart || event.start_datetime < entry.nextStart)) {
        entry.nextStart = event.start_datetime;
      }
      activity.set(event.place_id, entry);
      const start = new Date(event.start_datetime);
      if (status.key === "live" || (!event.recurrence_rule && isSameDay(start, now))) {
        today.push({ id: event.id, placeId: event.place_id, title: event.title, start, live: status.key === "live" });
      }
    }
  }
  today.sort((a, b) => a.start.getTime() - b.start.getTime());

  const openCount = places.filter((place) => getOpenStatus(place.opening_hours).open).length;
  const urgentCount = places.filter(
    (place) =>
      Boolean(place.urgent_message) &&
      (!place.urgent_message_expires_at || new Date(place.urgent_message_expires_at) > now),
  ).length;
  const placeName = new Map(places.map((place) => [place.id, place.name]));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-6 pb-16 sm:px-8 sm:pt-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="posto-title text-gray-900">Mes lieux</h1>
        <Link href="/dashboard/places/new" className={buttonClass("compact", "shrink-0 px-4")}>
          <PlusIcon />
          Ajouter un lieu
        </Link>
      </div>

      {places.length === 0 ? (
        <div className="border-y border-gray-200 py-12 text-center">
          <p className="font-medium text-gray-900">Votre premier lieu en quelques minutes</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
            Nom, adresse et une photo suffisent pour apparaître sur la carte. Le reste se complète ensuite.
          </p>
          <Link href="/dashboard/places/new" className={buttonClass("compact", "mt-5 px-4")}>
            <PlusIcon />
            Créer mon lieu
          </Link>
        </div>
      ) : (
        <>
          <section aria-label="Aujourd'hui" className="mb-8">
            <div className="grid grid-cols-3 divide-x divide-gray-200">
              <Figure value={openCount} total={places.length} label="ouverts maintenant" />
              <Figure value={today.length} label={today.length > 1 ? "événements aujourd'hui" : "événement aujourd'hui"} />
              <Figure value={urgentCount} label={urgentCount > 1 ? "messages urgents" : "message urgent"} />
            </div>
            {today.length > 0 && (
              <ul className="mt-4 flex flex-col gap-1">
                {today.slice(0, 4).map((event) => (
                  <li key={event.id}>
                    <Link
                      href={`/dashboard/places/${event.placeId}/evenements/${event.id}`}
                      className="-mx-3 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-gray-50"
                    >
                      <span className={`w-16 shrink-0 font-medium tabular-nums ${event.live ? "text-green-700" : "text-gray-900"}`}>
                        {event.live ? "En cours" : timeFormat.format(event.start)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-gray-900">{event.title}</span>
                      <span className="hidden shrink-0 truncate text-gray-500 sm:block">{placeName.get(event.placeId)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <ul className="divide-y divide-gray-200 border-y border-gray-200">
            {places.map((place) => (
              <DashboardPlaceCard
                key={place.id}
                place={place}
                activity={activity.get(place.id) ?? { upcomingCount: 0, nextStart: null }}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
