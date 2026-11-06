import { cache, ViewTransition } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  getPlaceById,
  getActivitiesForPlace,
  getUpcomingEventsForPlace,
} from "@/lib/queries";
import { getOpenStatus, listZoneNames } from "@/lib/opening-hours";
import { formatDuration, formatPrice } from "@/lib/eventSchedule";
import { OpeningHoursAccordion } from "@/components/OpeningHoursAccordion";
import { RestrictionsBadge } from "@/components/RestrictionsBadge";
import { AccessBadge } from "@/components/AccessBadge";
import { BackButton } from "@/components/ui/BackButton";
import { ShareButton } from "@/components/ui/ShareButton";
import { PlacePhotoGallery } from "@/components/PlacePhotoGallery";
import { placePhotos } from "@/lib/photos";
import { placeShareText } from "@/lib/share";
import { recordQrScan } from "@/lib/qrScans";
import { localBusinessJsonLd, jsonLdScriptContent } from "@/lib/structuredData";
import { getSiteOrigin } from "@/lib/site";
import { LocationMiniMap } from "@/components/LocationMiniMap";
import { PLACE_COLOR } from "@/lib/mapPopups";
import { FollowPlaceButton } from "@/components/consumer/FollowPlaceButton";
import { OpenStatusBadge } from "@/components/OpenStatusBadge";
import { ContactList } from "@/components/ContactList";
import { DirectionsButton } from "@/components/DirectionsButton";

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

function WarningIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true">
      <path d="M10 3.5 2.5 16.5h15L10 3.5Z" strokeLinejoin="round" />
      <path d="M10 8.5v3.5M10 14.25v.25" strokeLinecap="round" />
    </svg>
  );
}

// See the matching comment on the event page — memoizes the one DB round
// trip generateMetadata and the page body below both need for the same
// request.
const getCachedPlace = cache(async (id: string) => {
  const supabase = await createClient();
  return getPlaceById(supabase, id);
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const place = await getCachedPlace(id);
  if (!place) return {};

  const description = place.description
    ? place.description.slice(0, 160)
    : (place.address ?? "Découvrez ce lieu sur Posto.");

  return {
    title: place.name,
    description,
    openGraph: {
      title: place.name,
      description,
      type: "website",
      images: place.cover_photo_url ? [{ url: place.cover_photo_url }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: place.name,
      description,
      images: place.cover_photo_url ? [place.cover_photo_url] : undefined,
    },
  };
}

export default async function PlacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ src?: string }>;
}) {
  const { id } = await params;
  const { src } = await searchParams;
  const supabase = await createClient();
  const place = await getCachedPlace(id);

  if (!place) notFound();

  // Awaited (it's one fast insert) rather than fired-and-forgotten — on a
  // serverless deploy, a promise still in flight when the response is sent
  // can simply never finish, which would silently drop scans; recordQrScan
  // itself still swallows its own errors so this never fails the page.
  await recordQrScan(supabase, "place", id, src);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [activities, events, followResult] = await Promise.all([
    getActivitiesForPlace(supabase, place.id),
    getUpcomingEventsForPlace(supabase, place.id),
    user
      ? supabase
          .from("place_follows")
          .select("place_id")
          .eq("user_id", user.id)
          .eq("place_id", place.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  // Cover photo first (if set), then the gallery — one ordered set the
  // carousel cycles through, rather than a static cover plus a separate
  // scroll strip for the rest. Shared with the map popup's own mini
  // carousel (see lib/mapPopupContent.tsx) via lib/photos.ts, so both agree
  // on the same photo list for the same place.
  const photos = placePhotos(place);

  const openStatus = getOpenStatus(place.opening_hours);
  const zoneNames = listZoneNames(place.opening_hours);
  const hasUrgentMessage =
    !!place.urgent_message &&
    (!place.urgent_message_expires_at || new Date(place.urgent_message_expires_at) > new Date());

  const siteOrigin = await getSiteOrigin();
  const jsonLd = localBusinessJsonLd(place, `${siteOrigin}/places/${place.id}`);

  return (
    <div className="posto-detail-page">
      {/* Structured data only — invisible to a visitor, read by search
          engines (and, increasingly, AI answer engines) to understand
          "what is this place, where, when it's open" without scraping the
          page's prose. See structuredData.ts for the field-by-field
          reasoning. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScriptContent(jsonLd) }}
      />
      {hasUrgentMessage && (
        <div className="mx-4 mb-4 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:mx-0">
          <WarningIcon />
          <p className="whitespace-pre-line">{place.urgent_message}</p>
        </div>
      )}
      {/* Exact concentric radius with the BackButton circle sitting on this
          corner (see posto-conventions): the button is offset top-3/left-3
          (12px) and is itself a 36px circle (18px radius) — for the two
          arcs to share one center, outer radius = offset + button radius =
          12 + 18 = 30px. Not on Tailwind's standard scale (rounded-3xl
          tops out at 24px), so this is an arbitrary value rather than an
          approximation — the whole point here was an exact match, not "close
          enough". */}
      <ViewTransition name={`photo-place-${place.id}`} share="morph" default="none">
        <div className="posto-detail-hero">
          <PlacePhotoGallery photos={photos} alt={place.name} />
          <div className="absolute top-3 left-3 z-10">
            <BackButton fallbackHref="/" />
          </div>
          <div className="absolute top-3 right-3 z-10">
            <ShareButton title={place.name} text={placeShareText(place.name, place.address)} />
          </div>
        </div>
      </ViewTransition>

      <div className="posto-detail-content pt-5 sm:pt-6">

      <h1 className="posto-title min-w-0 break-words text-gray-900">{place.name}</h1>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{place.address}</p>

      <div className="mt-3">
        <OpenStatusBadge status={openStatus} />
      </div>

      <div className="posto-action-bar mt-5">
        <DirectionsButton lat={place.lat} lng={place.lng} primary />
        <FollowPlaceButton
          placeId={place.id}
          userId={user?.id ?? null}
          initialFollowing={Boolean(followResult.data)}
        />
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
        <section className="posto-section">
          <h2 className="posto-section-title">À propos</h2>
          <p className="posto-detail-card whitespace-pre-line p-4 text-sm leading-6 text-gray-700">{place.description}</p>
        </section>
      )}

      <section className="posto-section">
        <h2 className="posto-section-title">Horaires</h2>
        <OpeningHoursAccordion hours={place.opening_hours} todayIndex={new Date().getDay()} showStatus={false} />
        {zoneNames.length > 0 && (
          <div className="mt-3 flex flex-col gap-3">
            {zoneNames.map((zoneName) => (
              <div key={zoneName}>
                <p className="mb-1.5 text-sm font-medium text-gray-700">{zoneName}</p>
                <OpeningHoursAccordion
                  hours={place.opening_hours}
                  zoneName={zoneName}
                  todayIndex={new Date().getDay()}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {activities.length > 0 && (
        <section className="posto-section">
          <h2 className="posto-section-title">Activités</h2>
          <ul className="space-y-2">
            {activities.map((activity) => {
              const duration = formatDuration(activity.duration_minutes);
              return (
                <li
                  key={activity.id}
                  className="posto-detail-card p-4 text-sm"
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
                  {(activity.access || activity.restrictions) && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <AccessBadge access={activity.access} />
                      <RestrictionsBadge text={activity.restrictions} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Right before the "related events" list below — a small, contained
          preview of exactly where this place is, in the same visual style
          as the full /map, not the full explorer itself (no search, no
          other pins, no clustering — there's only ever one point here). */}
      <section className="posto-section">
        <h2 className="posto-section-title">Localisation</h2>
        <LocationMiniMap lat={place.lat} lng={place.lng} color={PLACE_COLOR} />
      </section>

      <ContactList place={place} />

      {events.length > 0 && (
        <section className="posto-section">
          <h2 className="posto-section-title">Événements à venir</h2>
          <ul className="space-y-2">
            {events.map((event) => {
              const start = new Date(event.start_datetime);
              const priceLabel = formatPrice(event.price_cents, event.price_unit);
              return (
                <li key={event.id}>
                  {/* Fixed height so every card in this list lines up the same
                      regardless of how long a given event's description is —
                      a description that used to run to several lines used to
                      stretch just its own card, breaking the row's rhythm.
                      overflow-hidden on the card is the real backstop (nothing
                      can ever push the box taller); line-clamp-2 below is what
                      keeps the cut looking deliberate (ends in "…") instead of
                      a hard, mid-character clip. */}
                  <Link
                    href={`/events/${event.id}`}
                    className="posto-detail-card posto-interactive-card flex min-h-32 overflow-hidden text-sm focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/10"
                  >
                    <div className="flex w-16 shrink-0 flex-col items-center justify-center gap-0.5 border-r border-gray-100 bg-gray-50 px-1 text-center">
                      <span className="text-xs text-gray-500">
                        {badgeWeekdayFormatter.format(start)}
                      </span>
                      <span className="text-2xl leading-none font-semibold text-gray-900 tabular-nums">
                        {start.getDate()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {badgeMonthFormatter.format(start)}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 overflow-hidden p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate font-medium text-gray-900">{event.title}</p>
                        {priceLabel && (
                          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                            {priceLabel}
                          </span>
                        )}
                      </div>
                      {event.description && (
                        <p className="line-clamp-2 text-gray-600">{event.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {event.restrictions && <RestrictionsBadge text={event.restrictions} />}
                        <p className="text-xs text-gray-500">
                          {eventDateFormatter.format(start)}
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      </div>
    </div>
  );
}
