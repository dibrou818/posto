"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PlaceWithRelations, EventWithPlace } from "@/lib/queries";
import { SearchBar } from "@/components/SearchBar";
import { PlaceCard } from "@/components/PlaceCard";
import { EventCard } from "@/components/EventCard";
import { LocationWeather } from "@/components/LocationWeather";
import { KindFilter } from "@/components/KindFilter";
import { LocationFilter, LOCATION_FILTER_RADIUS_KM, type LocationFilterValue } from "@/components/LocationFilter";
import { haversineKm } from "@/lib/distance";
import { usePlacesExplorer, type UserLocation } from "@/lib/usePlacesExplorer";
import type { ResultKindFilter } from "@/lib/resultFilter";
import { eventMatchesTag } from "@/lib/eventTags";
import { isOpenNow } from "@/lib/opening-hours";
import { isEventHappeningNow } from "@/lib/eventSchedule";
import { loadMorePlaces, loadMoreEvents } from "@/app/actions/explore";
import { EXPLORE_PAGE_SIZE } from "@/lib/explore";
import { useLoadMoreOnScroll } from "@/lib/useLoadMoreOnScroll";

function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="13" height="12" rx="1.5" />
      <path d="M3.5 8.5h13" />
      <path d="M7 3.5v3M13 3.5v3" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 18.5s-6-5.5-6-9.8a6 6 0 1 1 12 0c0 4.3-6 9.8-6 9.8Z" />
      <circle cx="10" cy="8.5" r="1.9" />
    </svg>
  );
}

// A place or an event, tagged with its own kind — the shape the merged
// "Tout" feed below is built from. Kept as a real discriminated union (not
// just rendering two arrays back to back) so the feed can be genuinely
// interleaved/sorted as one list instead of "all events then all places".
type FeedItem = { kind: "place"; place: PlaceWithRelations } | { kind: "event"; event: EventWithPlace };

export function HomeExplorer({
  initialPlaces,
  initialEvents,
}: {
  initialPlaces: PlaceWithRelations[];
  initialEvents: EventWithPlace[];
}) {
  const router = useRouter();
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationFilter, setLocationFilter] = useState<LocationFilterValue | null>(null);
  // Événements first by default (not "all") — it's what Posto actually
  // differentiates on, so it's also what a first-time visitor should land
  // looking at, not a mixed feed they have to filter down themselves.
  const [kindFilter, setKindFilter] = useState<ResultKindFilter>("event");
  // Deliberately applied *after* placesDisplay/eventsDisplay below rather
  // than folded into the location/tag fallback-tier logic those compute —
  // that logic's whole point is "never show a blank section, fall back to
  // something"; showing a closed place because nothing was open would defeat
  // the point of this filter rather than honor it. Empty here just means
  // empty, with its own message, no further fallback tier.
  const [openNowOnly, setOpenNowOnly] = useState(false);

  // The page only ever sends the first page of each list (see app/page.tsx)
  // — everything past that grows here via "Voir plus", one bounded fetch at
  // a time, instead of the route ever handing the browser (or the database)
  // the whole catalog at once. A page shorter than EXPLORE_PAGE_SIZE means
  // there's nothing left to page through.
  const [places, setPlaces] = useState(initialPlaces);
  const [events, setEvents] = useState(initialEvents);
  const [hasMorePlaces, setHasMorePlaces] = useState(initialPlaces.length >= EXPLORE_PAGE_SIZE);
  const [hasMoreEvents, setHasMoreEvents] = useState(initialEvents.length >= EXPLORE_PAGE_SIZE);
  const [loadingMorePlaces, setLoadingMorePlaces] = useState(false);
  const [loadingMoreEvents, setLoadingMoreEvents] = useState(false);

  // useCallback (not a plain function) because these are now also the
  // effect dependency useLoadMoreOnScroll's IntersectionObserver keys off
  // of — a fresh function identity every render would tear down and
  // re-create that observer just as often. Depending on places.length/
  // events.length (not an empty array) is deliberate, not an oversight:
  // the offset each call reads has to track the real current length, and
  // recreating the callback exactly when that length changes is correct,
  // not wasteful.
  const handleLoadMorePlaces = useCallback(async () => {
    setLoadingMorePlaces(true);
    try {
      const nextPage = await loadMorePlaces(places.length);
      setPlaces((prev) => [...prev, ...nextPage]);
      setHasMorePlaces(nextPage.length >= EXPLORE_PAGE_SIZE);
    } finally {
      setLoadingMorePlaces(false);
    }
  }, [places.length]);

  const handleLoadMoreEvents = useCallback(async () => {
    setLoadingMoreEvents(true);
    try {
      const nextPage = await loadMoreEvents(events.length);
      setEvents((prev) => [...prev, ...nextPage]);
      setHasMoreEvents(nextPage.length >= EXPLORE_PAGE_SIZE);
    } finally {
      setLoadingMoreEvents(false);
    }
  }, [events.length]);

  // Sorting reference: the chosen city once one is active, otherwise raw
  // geolocation if granted — either way, closest-first is more useful than
  // creation-order once we know roughly where the user is.
  const referencePoint = locationFilter ?? userLocation;
  const { selectedTag, setSelectedTag, places: sortedPlaces } = usePlacesExplorer(
    places,
    referencePoint,
  );

  // Once geolocation resolves to a city, auto-fill the location filter —
  // but only if the user hasn't already picked one by hand, so a manual
  // choice always wins.
  function handleCityResolved(city: string | null, loc: UserLocation) {
    if (!city) return;
    setLocationFilter((prev) => prev ?? { label: city, lat: loc.lat, lng: loc.lng });
  }

  const visiblePlaces = useMemo(() => {
    if (!locationFilter) return sortedPlaces;
    return sortedPlaces.filter(
      (p) => haversineKm(locationFilter.lat, locationFilter.lng, p.lat, p.lng) <= LOCATION_FILTER_RADIUS_KM,
    );
  }, [sortedPlaces, locationFilter]);

  const tagFilteredEvents = useMemo(
    () => (selectedTag ? events.filter((e) => eventMatchesTag(e, selectedTag.id)) : events),
    [events, selectedTag],
  );

  const visibleEvents = useMemo(() => {
    if (!locationFilter) return tagFilteredEvents;
    return tagFilteredEvents.filter(
      (e) =>
        haversineKm(locationFilter.lat, locationFilter.lng, e.place.lat, e.place.lng) <=
        LOCATION_FILTER_RADIUS_KM,
    );
  }, [tagFilteredEvents, locationFilter]);

  // Exact matches now, not "everything but the other kind" — "all" gets
  // its own merged feed (mergedFeed below) instead of these two sections
  // stacked on top of each other.
  const showEvents = kindFilter === "event";
  const showPlaces = kindFilter === "place";
  const showMerged = kindFilter === "all";

  // Same gate the old "Voir plus" button used (only on the normal,
  // non-fallback display tier — see placesDisplay/eventsDisplay below —
  // and never while a page is already in flight), just triggered by
  // scrolling near the sentinel at the bottom of each grid instead of a
  // click. hasMorePlaces/hasMoreEvents already going false is what makes
  // this stop calling the server once a section is exhausted.
  const placesSentinelRef = useLoadMoreOnScroll<HTMLDivElement>(
    handleLoadMorePlaces,
    visiblePlaces.length > 0 && hasMorePlaces && !loadingMorePlaces,
  );
  const eventsSentinelRef = useLoadMoreOnScroll<HTMLDivElement>(
    handleLoadMoreEvents,
    visibleEvents.length > 0 && hasMoreEvents && !loadingMoreEvents,
  );

  const sortByDistance = useCallback(
    <T extends { lat: number; lng: number }>(list: T[]): T[] => {
      if (!referencePoint) return list;
      return [...list].sort(
        (a, b) =>
          haversineKm(referencePoint.lat, referencePoint.lng, a.lat, a.lng) -
          haversineKm(referencePoint.lat, referencePoint.lng, b.lat, b.lng),
      );
    },
    [referencePoint],
  );

  const FALLBACK_COUNT = 6;

  // Never leave the user looking at a blank section: if nothing matches the
  // active filters, fall back one step at a time (drop the distance cap,
  // then the tag) until something can be shown. The heading is computed
  // *here*, tied to which tier actually produced the list, so it can never
  // claim "près de Reims" while showing places 160km away — once we're
  // shown a fallback list, the heading says so instead of repeating the
  // location/tag claim the results no longer back up.
  const placesDisplay = useMemo(() => {
    if (visiblePlaces.length > 0) {
      // This section only ever renders when kindFilter is exclusively
      // "place" (see showPlaces below) — "all" is its own merged feed
      // now, with no per-kind heading at all — so a heading here is
      // always shown, never conditional on kindFilter anymore.
      const heading = selectedTag
        ? `Lieux taggés ${selectedTag.label}`
        : locationFilter
          ? `Lieux près de ${locationFilter.label}`
          : "Lieux";
      return { list: visiblePlaces, heading, note: null as string | null };
    }
    if (sortedPlaces.length > 0) {
      return {
        list: sortedPlaces.slice(0, FALLBACK_COUNT),
        heading: `Aucun lieu près de ${locationFilter?.label}`,
        note: "Voici les lieux les plus proches :",
      };
    }
    if (places.length > 0) {
      return {
        list: sortByDistance(places).slice(0, FALLBACK_COUNT),
        heading: "Aucun lieu avec ce tag",
        note: "Voici tous les lieux :",
      };
    }
    return { list: [], heading: "Lieux", note: "Aucun lieu pour l'instant." };
  }, [visiblePlaces, sortedPlaces, places, selectedTag, locationFilter, sortByDistance]);

  const eventsDisplay = useMemo(() => {
    if (visibleEvents.length > 0) {
      // Same reasoning as placesDisplay's own heading above.
      const heading = selectedTag
        ? `Événements taggés ${selectedTag.label}`
        : locationFilter
          ? `Événements près de ${locationFilter.label}`
          : "Événements";
      return { list: visibleEvents, heading, note: null as string | null };
    }
    if (tagFilteredEvents.length > 0) {
      return {
        list: sortByDistance(tagFilteredEvents.map((e) => ({ ...e, lat: e.place.lat, lng: e.place.lng }))).slice(
          0,
          FALLBACK_COUNT,
        ),
        heading: `Aucun événement près de ${locationFilter?.label}`,
        note: "Voici les événements les plus proches :",
      };
    }
    if (events.length > 0) {
      return {
        list: sortByDistance(events.map((e) => ({ ...e, lat: e.place.lat, lng: e.place.lng }))).slice(
          0,
          FALLBACK_COUNT,
        ),
        heading: "Aucun événement avec ce tag",
        note: "Voici tous les événements à venir :",
      };
    }
    return { list: [], heading: "Événements à venir", note: "Aucun événement à venir pour l'instant." };
  }, [visibleEvents, tagFilteredEvents, events, selectedTag, locationFilter, sortByDistance]);

  const finalPlacesList = useMemo(() => {
    if (!openNowOnly) return placesDisplay.list;
    return placesDisplay.list.filter((p) => isOpenNow(p.opening_hours));
  }, [placesDisplay.list, openNowOnly]);

  const finalEventsList = useMemo(() => {
    if (!openNowOnly) return eventsDisplay.list;
    return eventsDisplay.list.filter((e) =>
      isEventHappeningNow(e.start_datetime, e.end_datetime, e.duration_minutes),
    );
  }, [eventsDisplay.list, openNowOnly]);

  // "Tout" is one interleaved feed now, not the two sections (with their
  // own "Lieux"/"Événements" headings) stacked one above the other — a
  // place and an event aren't different *categories* to browse
  // separately, they're both just "what you could do", so there's no
  // heading here at all; each card carries its own kind badge (see
  // EventCard/PlaceCard) instead. Order: closest-first once a location is
  // known — the one ordering that genuinely applies to both kinds of card
  // at once. Without a location, there's no shared axis to sort mixed
  // places/events by (price and date don't both exist on a place), so
  // this interleaves them round-robin instead of just concatenating two
  // already-sorted lists, which would just read as "all events, then all
  // places" — not actually mixed.
  const mergedFeed = useMemo((): FeedItem[] => {
    if (!showMerged) return [];
    const placeItems: FeedItem[] = finalPlacesList.map((place) => ({ kind: "place", place }));
    const eventItems: FeedItem[] = finalEventsList.map((event) => ({ kind: "event", event }));

    if (referencePoint) {
      const distanceOf = (item: FeedItem) =>
        haversineKm(
          referencePoint.lat,
          referencePoint.lng,
          item.kind === "place" ? item.place.lat : item.event.place.lat,
          item.kind === "place" ? item.place.lng : item.event.place.lng,
        );
      return [...placeItems, ...eventItems].sort((a, b) => distanceOf(a) - distanceOf(b));
    }

    const merged: FeedItem[] = [];
    const maxLength = Math.max(placeItems.length, eventItems.length);
    for (let i = 0; i < maxLength; i++) {
      if (eventItems[i]) merged.push(eventItems[i]);
      if (placeItems[i]) merged.push(placeItems[i]);
    }
    return merged;
  }, [showMerged, finalPlacesList, finalEventsList, referencePoint]);

  // One sentinel driving both lists at once while "Tout" is active — each
  // still grows independently (a place page and an event page each have
  // their own offset/hasMore), this just fires whichever of the two can
  // still load more.
  const handleLoadMoreMerged = useCallback(() => {
    if (hasMorePlaces && !loadingMorePlaces) handleLoadMorePlaces();
    if (hasMoreEvents && !loadingMoreEvents) handleLoadMoreEvents();
  }, [hasMorePlaces, loadingMorePlaces, handleLoadMorePlaces, hasMoreEvents, loadingMoreEvents, handleLoadMoreEvents]);
  const mergedSentinelRef = useLoadMoreOnScroll<HTMLDivElement>(
    handleLoadMoreMerged,
    showMerged && ((hasMorePlaces && !loadingMorePlaces) || (hasMoreEvents && !loadingMoreEvents)),
  );

  return (
    <div className="flex flex-1 flex-col">
      {/* Visually hidden — LocationWeather's own heading (city name or a
          locate CTA) is dynamic and isn't really "the page title", and
          without a real h1 anywhere the homepage gave a screen reader
          nothing to land on and no page-level SEO signal. */}
      <h1 className="sr-only">Posto — Découvrez des lieux et activités à Lille</h1>
      {/* Full-bleed to the screen edges — deliberately outside the p-4 the
          rest of the page content below uses, so this banner reads as one
          big block rather than a card floating in the page's own margins. */}
      <LocationWeather onLocated={setUserLocation} onCityResolved={handleCityResolved}>
        <SearchBar
          onSelectTag={setSelectedTag}
          onSelectResult={(r) =>
            router.push(r.result_type === "event" ? `/events/${r.id}` : `/places/${r.place_id}`)
          }
          onSelectCity={(city) => router.push(`/map?lat=${city.lat}&lng=${city.lng}`)}
          // No map here to fly a city/address to — LocationFilter (the
          // "Choisir une ville" chip right below) already covers picking a
          // city on this page, so a raw street address in these results
          // would just be a dead end. onSelectCity above stays required by
          // SearchBar's props but is effectively unreachable now.
          includeLocationResults={false}
          filter={kindFilter}
          onFilterChange={setKindFilter}
          // Same pill shape as the map's own search bar — one consistent
          // search-bar language across the app instead of two.
          inputRoundingClassName="rounded-full"
        />
      </LocationWeather>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <KindFilter value={kindFilter} onChange={setKindFilter} />
            <LocationFilter value={locationFilter} onChange={setLocationFilter} />
            <button
              type="button"
              onClick={() => setOpenNowOnly((v) => !v)}
              aria-pressed={openNowOnly}
              className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 ${
                openNowOnly
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-300 bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              Ouvert maintenant
            </button>
          </div>
          {selectedTag && (
            <button
              onClick={() => setSelectedTag(null)}
              className="flex w-fit items-center gap-1 rounded-full bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/30"
            >
              {selectedTag.label} ✕
            </button>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {/* "Tout" is a single merged feed (below) — no separate Lieux/
              Événements sections or headings once mixed, since a place and
              an event aren't different categories to browse, they're both
              just "what you could do". These two only render when the
              filter is exclusively one kind, which is also why their own
              heading is now unconditional (see placesDisplay/eventsDisplay
              above) instead of only showing in "all" mode — that mode
              doesn't reach this branch anymore. */}
          {showEvents && (
            <section className="flex flex-col gap-2">
              {eventsDisplay.heading && (
                <div className="flex items-center gap-1.5">
                  <span className="shrink-0 text-gray-900">
                    <CalendarIcon />
                  </span>
                  <h2 className="text-base font-bold text-gray-900">{eventsDisplay.heading}</h2>
                </div>
              )}
              {eventsDisplay.note && (
                <p className="text-sm text-gray-500">{eventsDisplay.note}</p>
              )}
              {openNowOnly && eventsDisplay.list.length > 0 && finalEventsList.length === 0 && (
                <p className="text-sm text-gray-500">Rien en cours pour l&apos;instant.</p>
              )}
              {finalEventsList.length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {finalEventsList.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      distanceKm={
                        referencePoint
                          ? haversineKm(referencePoint.lat, referencePoint.lng, event.place.lat, event.place.lng)
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
              {/* No button: a sentinel div instead — useLoadMoreOnScroll
                  fires the next fetch once this scrolls near the viewport.
                  Only armed on the normal (non-fallback) tier — loading
                  more raw events while e.g. "Aucun événement près de X" is
                  already showing a distance-sorted fallback slice would
                  just be confusing, not more useful. */}
              {visibleEvents.length > 0 && hasMoreEvents && (
                <div ref={eventsSentinelRef} className="flex justify-center py-2">
                  {loadingMoreEvents && <p className="text-xs text-gray-400">Chargement...</p>}
                </div>
              )}
            </section>
          )}

          {showPlaces && (
            <section className="flex flex-col gap-2">
              {/* Same icon+bold treatment as the Événements heading (its
                  own CalendarIcon chip) — now that Lieux gets its own
                  exclusive section too (this only renders when kindFilter
                  is precisely "place"), the pin should read just as
                  clearly as the calendar does, not a plainer sibling. */}
              {placesDisplay.heading && (
                <div className="flex items-center gap-1.5">
                  <span className="shrink-0 text-gray-900">
                    <PinIcon />
                  </span>
                  <h2 className="text-base font-bold text-gray-900">{placesDisplay.heading}</h2>
                </div>
              )}
              {placesDisplay.note && (
                <p className="text-sm text-gray-500">{placesDisplay.note}</p>
              )}
              {openNowOnly && placesDisplay.list.length > 0 && finalPlacesList.length === 0 && (
                <p className="text-sm text-gray-500">Rien d&apos;ouvert pour l&apos;instant.</p>
              )}
              {finalPlacesList.length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {finalPlacesList.map((place) => (
                    <PlaceCard
                      key={place.id}
                      place={place}
                      distanceKm={
                        referencePoint
                          ? haversineKm(referencePoint.lat, referencePoint.lng, place.lat, place.lng)
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
              {visiblePlaces.length > 0 && hasMorePlaces && (
                <div ref={placesSentinelRef} className="flex justify-center py-2">
                  {loadingMorePlaces && <p className="text-xs text-gray-400">Chargement...</p>}
                </div>
              )}
            </section>
          )}

          {/* "Tout": one interleaved grid, no heading — see mergedFeed's
              own comment above for why. Each card's own corner badge
              (EventKindBadge/PlaceKindBadge) is what tells a place from an
              event here instead. */}
          {showMerged && (
            <section className="flex flex-col gap-2">
              {mergedFeed.length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {mergedFeed.map((item) =>
                    item.kind === "event" ? (
                      <EventCard
                        key={`event-${item.event.id}`}
                        event={item.event}
                        distanceKm={
                          referencePoint
                            ? haversineKm(referencePoint.lat, referencePoint.lng, item.event.place.lat, item.event.place.lng)
                            : undefined
                        }
                      />
                    ) : (
                      <PlaceCard
                        key={`place-${item.place.id}`}
                        place={item.place}
                        distanceKm={
                          referencePoint
                            ? haversineKm(referencePoint.lat, referencePoint.lng, item.place.lat, item.place.lng)
                            : undefined
                        }
                      />
                    ),
                  )}
                </div>
              )}
              {mergedFeed.length === 0 && (
                <p className="text-sm text-gray-500">
                  {openNowOnly ? "Rien d'ouvert ni en cours pour l'instant." : "Rien à afficher pour l'instant."}
                </p>
              )}
              {((hasMorePlaces && !loadingMorePlaces) || (hasMoreEvents && !loadingMoreEvents)) && (
                <div ref={mergedSentinelRef} className="flex justify-center py-2">
                  {(loadingMorePlaces || loadingMoreEvents) && (
                    <p className="text-xs text-gray-400">Chargement...</p>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
