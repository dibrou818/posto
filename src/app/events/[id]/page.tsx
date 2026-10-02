import { eventStatus } from "@/lib/eventStatus";
import { cache } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getEventById } from "@/lib/queries";
import { BackButton } from "@/components/ui/BackButton";
import { ShareButton } from "@/components/ui/ShareButton";
import { RecurrenceBadge } from "@/components/RecurrenceBadge";
import { RestrictionsBadge } from "@/components/RestrictionsBadge";
import { formatEventSchedule, formatDuration, formatPrice } from "@/lib/eventSchedule";
import { eventShareText } from "@/lib/share";
import { AddToCalendarButton } from "@/components/ui/AddToCalendarButton";
import { getSiteOrigin } from "@/lib/site";
import { recordQrScan } from "@/lib/qrScans";
import { eventJsonLd, jsonLdScriptContent } from "@/lib/structuredData";
import { LocationMiniMap } from "@/components/LocationMiniMap";
import { EVENT_COLOR } from "@/lib/mapPopups";
import { SaveEventButton } from "@/components/consumer/SaveEventButton";
import { ContactList } from "@/components/ContactList";
import { DirectionsButton } from "@/components/DirectionsButton";

// Wrapped in React's cache() so generateMetadata and the page body below —
// both called for the same request — share one DB round trip instead of
// two: cache() memoizes by argument for the lifetime of a single render,
// which is exactly the "fetch once, use twice" case Next.js's own docs
// point at this for.
const getCachedEvent = cache(async (id: string) => {
  const supabase = await createClient();
  return getEventById(supabase, id);
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await getCachedEvent(id);
  if (!event) return {};

  const dateLabel = formatEventSchedule(event.start_datetime, event.end_datetime);
  const description = event.description
    ? event.description.slice(0, 160)
    : `${dateLabel} · ${event.place.name}`;
  const imageUrl = event.cover_photo_url ?? event.place.cover_photo_url;

  return {
    title: event.title,
    description,
    openGraph: {
      title: event.title,
      description,
      type: "website",
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ src?: string }>;
}) {
  const { id } = await params;
  const { src } = await searchParams;
  const event = await getCachedEvent(id);

  if (!event) notFound();

  // See the matching comment on the place page: awaited on purpose, one
  // fast insert, errors swallowed inside recordQrScan itself.
  const supabase = await createClient();
  await recordQrScan(supabase, "event", id, src);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: savedEvent } = user
    ? await supabase
        .from("event_saves")
        .select("event_id")
        .eq("user_id", user.id)
        .eq("event_id", event.id)
        .maybeSingle()
    : { data: null };

  const { place } = event;
  const status = eventStatus(event.start_datetime, event.end_datetime);
  const isPast = status === "Terminé" || status === "Début passé";
  const dateLabel = formatEventSchedule(event.start_datetime, event.end_datetime);
  const priceLabel = formatPrice(event.price_cents, event.price_unit);

  // The event can have its own photo; falls back to the place's when it
  // doesn't bother setting one.
  const coverPhotoUrl = event.cover_photo_url ?? place.cover_photo_url;

  const siteOrigin = await getSiteOrigin();
  const calendarEvent = {
    id: event.id,
    title: event.title,
    description: event.description,
    startDatetime: event.start_datetime,
    endDatetime: event.end_datetime,
    durationMinutes: event.duration_minutes,
    placeName: place.name,
    placeAddress: place.address,
    pageUrl: `${siteOrigin}/events/${event.id}`,
  };
  const jsonLd = eventJsonLd(event, `${siteOrigin}/events/${event.id}`);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
      {/* Structured data only — see the matching comment on the place
          page / structuredData.ts. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScriptContent(jsonLd) }}
      />
      {/* rounded-[30px] — see the matching comment on the place page's own
          hero photo (same BackButton-over-corner pairing, same exact-match
          derivation: 12px offset + 18px button radius). */}
      <div className="relative mb-4 h-64 w-full overflow-hidden rounded-2xl sm:h-80 bg-gray-100">
        {coverPhotoUrl && (
          <Image
            src={coverPhotoUrl}
            alt={event.title}
            fill
            sizes="768px"
            className="object-cover"
            priority
          />
        )}
        <div className="absolute top-3 left-3">
          <BackButton fallbackHref="/" />
        </div>
        <div className="absolute top-3 right-3 z-10">
          <ShareButton title={event.title} text={eventShareText(event.title, dateLabel, place.address)} />
        </div>
      </div>

      <div className="flex items-start justify-between gap-3">
        <h1 className="posto-title min-w-0 break-words text-gray-900">{event.title}</h1>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
            isPast ? "bg-gray-100 text-gray-500" : "bg-green-100 text-green-700"
          }`}
        >
          {status}
        </span>
      </div>

      <p className="mt-1 text-sm text-gray-500">{dateLabel}</p>

      <div className="mt-5 flex flex-wrap items-start gap-2">
        <SaveEventButton
          eventId={event.id}
          userId={user?.id ?? null}
          initialSaved={Boolean(savedEvent)}
        />
        <AddToCalendarButton event={calendarEvent} />
      </div>

      {(priceLabel || event.recurrence_rule || event.duration_minutes) && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {priceLabel && (
            <span className="rounded-full bg-gray-900 px-2.5 py-1 text-xs font-medium text-white">
              {priceLabel}
            </span>
          )}
          {formatDuration(event.duration_minutes) && (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
              Durée : {formatDuration(event.duration_minutes)}
            </span>
          )}
          <RecurrenceBadge rule={event.recurrence_rule} />
        </div>
      )}

      {event.description && (
        <p className="mt-4 whitespace-pre-line text-sm text-gray-700">{event.description}</p>
      )}

      {event.restrictions && (
        <div className="mt-3">
          <RestrictionsBadge text={event.restrictions} />
        </div>
      )}

      {/* Right before the "Lieu" card below — a small, contained preview of
          exactly where this event is (its venue's own point — an event has
          no location beyond that), same visual style as the full /map. In
          EVENT_COLOR, not the place's usual dark dot: this page is about
          the event, not the venue itself. */}
      <section className="mt-8">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Localisation</h2>
          <DirectionsButton lat={place.lat} lng={place.lng} />
        </div>
        <LocationMiniMap lat={place.lat} lng={place.lng} color={EVENT_COLOR} />
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Lieu</h2>
        <Link
          href={`/places/${place.id}`}
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
        >
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
            {place.cover_photo_url && (
              <Image src={place.cover_photo_url} alt={place.name} fill sizes="56px" className="object-cover" />
            )}
          </div>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-gray-900">{place.name}</span>
            {place.address && (
              <span className="block truncate text-xs text-gray-500">{place.address}</span>
            )}
          </span>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0 text-gray-500">
            <path d="M7.5 4.5 13 10l-5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </section>

      <ContactList place={place} />
    </div>
  );
}
