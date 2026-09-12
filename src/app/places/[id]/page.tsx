import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getPlaceById,
  getActivitiesForPlace,
  getUpcomingEventsForPlace,
} from "@/lib/queries";
import { isOpenNow, scheduleByDay, listZoneNames } from "@/lib/opening-hours";
import { formatDuration } from "@/lib/eventSchedule";
import { OpeningHoursAccordion } from "@/components/OpeningHoursAccordion";
import { RestrictionsBadge } from "@/components/RestrictionsBadge";
import { BackButton } from "@/components/ui/BackButton";
import { ShareButton } from "@/components/ui/ShareButton";

const eventDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

// Short weekday/month for the big date badge on each event card (e.g. "mer." / "9" / "sept.").
const badgeWeekdayFormatter = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
const badgeMonthFormatter = new Intl.DateTimeFormat("fr-FR", { month: "short" });

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
  const zoneNames = listZoneNames(place.opening_hours);
  const hasUrgentMessage =
    !!place.urgent_message &&
    (!place.urgent_message_expires_at || new Date(place.urgent_message_expires_at) > new Date());

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      {hasUrgentMessage && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="mt-0.5 shrink-0" aria-hidden="true">
            ⚠️
          </span>
          <p className="whitespace-pre-line">{place.urgent_message}</p>
        </div>
      )}
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
        <div className="absolute top-3 left-3">
          <BackButton fallbackHref="/" />
        </div>
      </div>

      {place.photo_urls.length > 0 && (
        <div className="mb-4 -mt-2 flex gap-2 overflow-x-auto pb-1">
          {place.photo_urls.map((url, i) => (
            <div key={url} className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-gray-100">
              <Image src={url} alt={`${place.name} — photo ${i + 2}`} fill sizes="112px" className="object-cover" />
            </div>
          ))}
        </div>
      )}

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

      <div className="mt-3 flex flex-wrap gap-2">
        {place.phone && (
          <a
            href={`tel:${place.phone}`}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/30 focus-visible:ring-offset-2"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M3.654 1.328a.678.678 0 0 1 1.015-.063l2.008 2.008a.678.678 0 0 1 .166.685l-.622 2.072a.678.678 0 0 0 .166.685l4.898 4.898a.678.678 0 0 0 .685.166l2.072-.622a.678.678 0 0 1 .685.166l2.008 2.008a.678.678 0 0 1-.063 1.015l-1.462 1.146a1.678 1.678 0 0 1-1.665.229C10.4 14.34 5.66 9.6 4.279 6.455a1.678 1.678 0 0 1 .23-1.665l1.145-1.462Z" />
            </svg>
            Appeler {place.phone}
          </a>
        )}
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
            <path d="M10 18s6-5.5 6-10a6 6 0 1 0-12 0c0 4.5 6 10 6 10Z" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="10" cy="8" r="2.2" />
          </svg>
          Itinéraire
        </a>
        {place.website_url && (
          <a
            href={place.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
              <circle cx="10" cy="10" r="7.5" />
              <path d="M2.5 10h15M10 2.5a11 11 0 0 1 3 7.5 11 11 0 0 1-3 7.5 11 11 0 0 1-3-7.5 11 11 0 0 1 3-7.5Z" />
            </svg>
            Site web
          </a>
        )}
        {place.instagram_url && (
          <a
            href={place.instagram_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-900 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
              <rect x="2.5" y="2.5" width="15" height="15" rx="4" />
              <circle cx="10" cy="10" r="3.6" />
              <circle cx="14.2" cy="5.8" r="0.9" fill="currentColor" stroke="none" />
            </svg>
          </a>
        )}
        {place.facebook_url && (
          <a
            href={place.facebook_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-900 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
              <path d="M12.5 6.5h-1.3c-.9 0-1.2.4-1.2 1.2v1.8h2.4l-.3 2.4h-2.1v6.1H7.4v-6.1H5.5V9.5h1.9V7.4c0-2 1.1-3.4 3.2-3.4h1.9v2.5Z" />
            </svg>
          </a>
        )}
        <ShareButton title={place.name} text={`${place.name} sur Posto`} />
      </div>

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
        <OpeningHoursAccordion schedule={schedule} todayIndex={new Date().getDay()} />
        {zoneNames.length > 0 && (
          <div className="mt-3 flex flex-col gap-3">
            {zoneNames.map((zoneName) => (
              <div key={zoneName}>
                <p className="mb-1.5 text-sm font-medium text-gray-700">{zoneName}</p>
                <OpeningHoursAccordion
                  schedule={scheduleByDay(place.opening_hours, zoneName)}
                  todayIndex={new Date().getDay()}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {activities.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Activités</h2>
          <ul className="space-y-2">
            {activities.map((activity) => {
              const duration = formatDuration(activity.duration_minutes);
              return (
                <li
                  key={activity.id}
                  className="rounded-xl border border-gray-200 bg-white p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-gray-900">{activity.name}</p>
                    {duration && (
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {duration}
                      </span>
                    )}
                  </div>
                  {activity.description && (
                    <p className="mt-1 text-gray-600">{activity.description}</p>
                  )}
                  {activity.restrictions && (
                    <div className="mt-2">
                      <RestrictionsBadge text={activity.restrictions} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {events.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Événements à venir</h2>
          <ul className="space-y-2">
            {events.map((event) => {
              const start = new Date(event.start_datetime);
              return (
                <li key={event.id}>
                  <Link
                    href={`/events/${event.id}`}
                    className="flex overflow-hidden rounded-xl border border-gray-200 bg-white text-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
                  >
                    <div className="flex w-16 shrink-0 flex-col items-center justify-center gap-0.5 border-r border-gray-100 bg-gray-50 px-1 text-center">
                      <span className="text-[11px] font-medium uppercase text-gray-500">
                        {badgeWeekdayFormatter.format(start)}
                      </span>
                      <span className="text-2xl leading-none font-bold text-gray-900">
                        {start.getDate()}
                      </span>
                      <span className="text-[11px] font-medium uppercase text-gray-500">
                        {badgeMonthFormatter.format(start)}
                      </span>
                    </div>
                    <div className="flex-1 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-gray-900">{event.title}</p>
                        {event.price && (
                          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                            {event.price}
                          </span>
                        )}
                      </div>
                      {event.description && (
                        <p className="mt-1 text-gray-600">{event.description}</p>
                      )}
                      {event.restrictions && (
                        <div className="mt-1.5">
                          <RestrictionsBadge text={event.restrictions} />
                        </div>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        {eventDateFormatter.format(start)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
