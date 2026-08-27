import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getPlaceById,
  getActivitiesForPlace,
  getUpcomingEventsForPlace,
} from "@/lib/queries";
import { isOpenNow, scheduleByDay } from "@/lib/opening-hours";

const eventDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function PlacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const place = await getPlaceById(supabase, id);

  if (!place) notFound();

  const [activities, events] = await Promise.all([
    getActivitiesForPlace(supabase, place.id),
    getUpcomingEventsForPlace(supabase, place.id),
  ]);

  const open = isOpenNow(place.opening_hours);
  const schedule = scheduleByDay(place.opening_hours);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="relative mb-4 h-64 w-full overflow-hidden rounded-xl bg-gray-100">
        {place.cover_photo_url && (
          <Image
            src={place.cover_photo_url}
            alt={place.name}
            fill
            sizes="768px"
            className="object-cover"
            priority
          />
        )}
      </div>

      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{place.name}</h1>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
            open ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
          }`}
        >
          {open ? "Ouvert maintenant" : "Fermé"}
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-500">{place.address}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {place.tags.map((tag) => (
          <span
            key={tag.id}
            className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600"
          >
            {tag.label}
          </span>
        ))}
      </div>

      {place.description && (
        <p className="mt-4 whitespace-pre-line text-sm text-gray-700">{place.description}</p>
      )}

      <section className="mt-8">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Horaires</h2>
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white text-sm">
          {schedule.map((day) => (
            <li key={day.dayOfWeek} className="flex justify-between px-4 py-2">
              <span className="text-gray-600">{day.label}</span>
              <span className="text-gray-900">
                {day.hours.length === 0
                  ? "Fermé"
                  : day.hours
                      .map((h) => `${h.open_time.slice(0, 5)} - ${h.close_time.slice(0, 5)}`)
                      .join(", ")}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {activities.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Activités</h2>
          <ul className="space-y-2">
            {activities.map((activity) => (
              <li
                key={activity.id}
                className="rounded-lg border border-gray-200 bg-white p-3 text-sm"
              >
                <p className="font-medium text-gray-900">{activity.name}</p>
                {activity.description && (
                  <p className="mt-1 text-gray-600">{activity.description}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {events.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Événements à venir</h2>
          <ul className="space-y-2">
            {events.map((event) => (
              <li
                key={event.id}
                className="rounded-lg border border-gray-200 bg-white p-3 text-sm"
              >
                <p className="font-medium text-gray-900">{event.title}</p>
                <p className="text-xs text-gray-500">
                  {eventDateFormatter.format(new Date(event.start_datetime))}
                </p>
                {event.description && (
                  <p className="mt-1 text-gray-600">{event.description}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
