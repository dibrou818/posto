import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getPlacesByOwner } from "@/lib/queries";
import { DashboardPlaceCard, type PlaceActivity } from "@/components/dashboard/DashboardPlaceCard";
import { getEventStatus } from "@/lib/dashboardEventStatus";
import { buttonClass } from "@/lib/ui";

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();
  const places = await getPlacesByOwner(supabase, user.id);

  // One query for the events of every place, grouped here: what's still to
  // come per place, and when the next one is.
  const activity = new Map<string, PlaceActivity>();
  if (places.length > 0) {
    const { data: events } = await supabase
      .from("events")
      .select("place_id, start_datetime, end_datetime, duration_minutes, recurrence_rule")
      .in("place_id", places.map((place) => place.id));
    const now = new Date();
    for (const event of events ?? []) {
      if (getEventStatus(event, now).key === "past") continue;
      const entry = activity.get(event.place_id) ?? { upcomingCount: 0, nextStart: null };
      entry.upcomingCount += 1;
      if (!event.recurrence_rule && (!entry.nextStart || event.start_datetime < entry.nextStart)) {
        entry.nextStart = event.start_datetime;
      }
      activity.set(event.place_id, entry);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="posto-title text-gray-900">Mes lieux</h1>
        <Link href="/dashboard/places/new" className={buttonClass("default", "w-full text-center sm:w-auto")}>
          Ajouter un lieu
        </Link>
      </div>

      {places.length === 0 ? (
        <p className="text-sm text-gray-500">Vous n&apos;avez pas encore de lieu. Créez-en un pour commencer.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {places.map((place) => (
            <DashboardPlaceCard
              key={place.id}
              place={place}
              activity={activity.get(place.id) ?? { upcomingCount: 0, nextStart: null }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
