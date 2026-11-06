"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PlaceWithRelations, EventWithPlace, Tag } from "@/lib/queries";
import { SearchBar } from "@/components/SearchBar";
import { PlaceCard } from "@/components/PlaceCard";
import { EventCard } from "@/components/EventCard";
import { LocationWeather } from "@/components/LocationWeather";
import { ExploreFilterBar } from "@/components/ExploreFilterBar";
import { LocationFilter, LOCATION_FILTER_RADIUS_KM, type LocationFilterValue } from "@/components/LocationFilter";
import { useEventFilters } from "@/lib/useEventFilters";
import { EmptyResults } from "@/components/ui/EmptyResults";
import { ALL_EVENT_DATES } from "@/lib/eventDateFilter";
import { haversineKm } from "@/lib/distance";
import { usePlacesExplorer, type UserLocation } from "@/lib/usePlacesExplorer";
import type { ResultKindFilter } from "@/lib/resultFilter";
import { eventMatchesTag } from "@/lib/eventTags";
import { isOpenNow } from "@/lib/opening-hours";
import { loadMorePlaces, loadMoreEvents } from "@/app/actions/explore";
import { EXPLORE_PAGE_SIZE } from "@/lib/explore";
import { useLoadMoreOnScroll } from "@/lib/useLoadMoreOnScroll";

// A place or an event, tagged with its own kind — the shape the merged
// "Tout" feed below is built from. Kept as a real discriminated union (not
// just rendering two arrays back to back) so the feed can be genuinely
// interleaved/sorted as one list instead of "all events then all places".
type FeedItem = { kind: "place"; place: PlaceWithRelations } | { kind: "event"; event: EventWithPlace };

export function HomeExplorer({
  initialPlaces,
  initialEvents,
  allTags,
  forYou,
}: {
  initialPlaces: PlaceWithRelations[];
  initialEvents: EventWithPlace[];
  allTags: Tag[];
  /** Upcoming events of the places this visitor follows — only for a
   * signed-in visitor who follows at least one place. */
  forYou?: EventWithPlace[];
}) {
  const router = useRouter();
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationFilter, setLocationFilter] = useState<LocationFilterValue | null>(null);
  // Événements first by default (not "all") — it's what Posto actually
  // differentiates on, so it's also what a first-time visitor should land
  // looking at, not a mixed feed they have to filter down themselves. With
  // no upcoming event at all, that tab would open on an empty screen, so the
  // places (always there, with their live status) take its place.
  const [kindFilter, setKindFilter] = useState<ResultKindFilter>(initialEvents.length > 0 ? "event" : "place");
  // Date, budget, duration, access and "open now" — shared with the map (see
  // useEventFilters). All of them are hard filters applied after the fallback
  // tiers below: a closed place or an out-of-budget event is never shown just
  // because nothing matched.
  const filters = useEventFilters();
  const { openNowOnly } = filters;

  // The page only ever sends the first page of each list (see app/page.tsx)
  // — everything past that grows here via "Voir plus", one bounded fetch at
  // a time, instead of the route ever handing the browser (or the database)
  // the whole catalog at once. A page shorter than EXPLORE_PAGE_SIZE means
  // there's nothing left to page through.
  const [places, setPlaces] = useState(initialPlaces);
  const [events, setEvents] = useState(initialEvents);
  const [hasMorePlaces, setHasMorePlaces] = useState(initialPlaces.length >= EXPLORE_PAGE_SIZE);
  const [hasMoreEvents, setHasMoreEvents] = useState(initialEvents.length >= EXPLORE_PAGE_SIZE);
  const [paginationError, setPaginationError] = useState(false);
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
    setPaginationError(false);
    setLoadingMorePlaces(true);
    try {
      const nextPage = await loadMorePlaces(places.length);
      setPlaces((prev) => [...prev, ...nextPage]);
      setHasMorePlaces(nextPage.length >= EXPLORE_PAGE_SIZE);
    } catch {
      setPaginationError(true);
    } finally {
      setLoadingMorePlaces(false);
    }
  }, [places.length]);

  const handleLoadMoreEvents = useCallback(async () => {
    setPaginationError(false);
    setLoadingMoreEvents(true);
    try {
      const nextPage = await loadMoreEvents(events.length);
      setEvents((prev) => [...prev, ...nextPage]);
      setHasMoreEvents(nextPage.length >= EXPLORE_PAGE_SIZE);
    } catch {
      setPaginationError(true);
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

  // Filters and tags are applied here in the browser, to whatever pages have
  // been fetched so far — with only the first 9 loaded, "2 results" would be
  // a lie. So while one is active, the remaining pages are pulled in one
  // after the other (the catalogue is small; each call is one bounded page)
  // until the counts are real.
  const filtersActive = filters.activeCount > 0 || Boolean(selectedTag);
  useEffect(() => {
    if (!filtersActive || paginationError) return;
    // Deferred a tick (react-hooks/set-state-in-effect), like the other
    // effects in this app that start a state-setting fetch on their own.
    queueMicrotask(() => {
      if (hasMoreEvents && !loadingMoreEvents) void handleLoadMoreEvents();
      if (hasMorePlaces && !loadingMorePlaces) void handleLoadMorePlaces();
    });
  }, [
    filtersActive,
    paginationError,
    hasMoreEvents,
    loadingMoreEvents,
    handleLoadMoreEvents,
    hasMorePlaces,
    loadingMorePlaces,
    handleLoadMorePlaces,
  ]);

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
    !paginationError && hasMorePlaces && !loadingMorePlaces,
  );
  const eventsSentinelRef = useLoadMoreOnScroll<HTMLDivElement>(
    handleLoadMoreEvents,
    !paginationError && hasMoreEvents && !loadingMoreEvents,
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
    // Nothing scheduled at all: the section shows its own way out below
    // (see the EmptyResults under the heading) instead of a dead note.
    return { list: [], heading: "Événements à venir", note: null };
  }, [visibleEvents, tagFilteredEvents, events, selectedTag, locationFilter, sortByDistance]);

  const finalPlacesList = useMemo(() => {
    if (!openNowOnly) return placesDisplay.list;
    return placesDisplay.list.filter((p) => isOpenNow(p.opening_hours));
  }, [placesDisplay.list, openNowOnly]);

  const finalEventsList = useMemo(
    () => eventsDisplay.list.filter(filters.matchesEvent),
    [eventsDisplay.list, filters.matchesEvent],
  );

  // Shared by both places the events section can go empty after filtering
  // (its own exclusive section, and the merged "Tout" feed) — one message
  // that names whichever combination of hard filters actually emptied it,
  // instead of near-duplicate ternaries drifting apart over time. Each
  // filter alone gets its own precise phrasing (matching the existing
  // wording below); two or more active at once fall back to one generic
  // phrase rather than trying to grammatically stitch mismatched clauses
  // ("d'ouvert" vs "dans ce budget") into a single sentence.
  const emptyEventsReason = filters.activeCount === 0 ? null : "rien ne correspond à ces filtres";

  // The way out of an empty list: a gentler next step when the date is the
  // likely culprit ("Aujourd'hui" → "Demain"), and always a full reset.
  const resetAllFilters = () => {
    filters.resetMore();
    filters.setDateFilter(ALL_EVENT_DATES);
    setSelectedTag(null);
  };
  const emptyActions = () => {
    const actions: { label: string; onClick: () => void; primary?: boolean }[] = [];
    if (filters.dateFilter.kind === "today") {
      actions.push({ label: "Voir demain", primary: true, onClick: () => filters.setDateFilter({ kind: "tomorrow" }) });
    } else if (filters.dateFilter.kind === "tomorrow") {
      actions.push({ label: "Voir ce week-end", primary: true, onClick: () => filters.setDateFilter({ kind: "weekend" }) });
    }
    actions.push({ label: "Réinitialiser les filtres", primary: actions.length === 0, onClick: resetAllFilters });
    return actions;
  };

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
    !paginationError && showMerged && ((hasMorePlaces && !loadingMorePlaces) || (hasMoreEvents && !loadingMoreEvents)),
  );

  return (
    <div className="flex flex-1 flex-col">
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
          // Same referencePoint already driving distance-sort/radius
          // filtering below — an explicitly chosen city wins over raw
          // geolocation for search ranking too, for the same reason it
          // does everywhere else on this page.
          userLocation={referencePoint}
        />
      </LocationWeather>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        {forYou && forYou.length > 0 && (
          <section aria-labelledby="for-you-heading" className="flex flex-col gap-3">
            <h2 id="for-you-heading" className="text-lg font-semibold tracking-tight text-gray-900">
              Pour vous
              <span className="ml-2 text-sm font-normal text-gray-500">Les lieux que vous suivez</span>
            </h2>
            {/* Snap-scrolling row, bleeding to the screen edge on phones so it
                reads as swipeable; cards keep a fixed width so the next one
                peeks in. */}
            <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {forYou.map((event) => (
                <div key={event.id} className="w-[44%] max-w-56 shrink-0 snap-start sm:w-56">
                  <EventCard event={event} morph={false} variant="tile" />
                </div>
              ))}
            </div>
          </section>
        )}

        <ExploreFilterBar
          kind={kindFilter}
          onKindChange={setKindFilter}
          filters={filters}
          tags={allTags}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
          locationChip={<LocationFilter value={locationFilter} onChange={setLocationFilter} />}
          resultCount={showMerged ? mergedFeed.length : showEvents ? finalEventsList.length : finalPlacesList.length}
        />

        {paginationError && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          La suite des résultats n’a pas pu être chargée.
          <button type="button" className="ml-2 min-h-11 px-2 font-semibold underline" onClick={() => { if (kindFilter !== "place" && hasMoreEvents) void handleLoadMoreEvents(); if (kindFilter !== "event" && hasMorePlaces) void handleLoadMorePlaces(); }}>Réessayer</button>
        </div>}
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
                <div className="flex items-center gap-2">
                  <h2 className="posto-heading text-lg text-gray-900">{eventsDisplay.heading}</h2>
                </div>
              )}
              {eventsDisplay.note && (
                <p className="text-sm text-gray-500">{eventsDisplay.note}</p>
              )}
              {eventsDisplay.list.length === 0 && (
                <EmptyResults
                  title="Pas d'événement prévu pour l'instant"
                  description="Les lieux, eux, sont là : regardez ce qui est ouvert maintenant."
                  actions={[
                    {
                      label: "Voir les lieux ouverts",
                      primary: true,
                      onClick: () => {
                        setKindFilter("place");
                        filters.setOpenNowOnly(true);
                      },
                    },
                  ]}
                />
              )}
              {emptyEventsReason && eventsDisplay.list.length > 0 && finalEventsList.length === 0 && (
                <EmptyResults
                  title="Aucun événement ne correspond"
                  description="Essayez une autre date, ou retirez un filtre."
                  actions={emptyActions()}
                />
              )}
              {finalEventsList.length > 0 && (
                <div className="grid grid-cols-1 gap-y-3.5 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-7 lg:grid-cols-4">
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
              {hasMoreEvents && (
                <div ref={eventsSentinelRef} className="flex justify-center py-2">
                  {loadingMoreEvents && <p className="text-xs text-gray-500">Chargement…</p>}
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
                <div className="flex items-center gap-2">
                  <h2 className="posto-heading text-lg text-gray-900">{placesDisplay.heading}</h2>
                </div>
              )}
              {placesDisplay.note && (
                <p className="text-sm text-gray-500">{placesDisplay.note}</p>
              )}
              {openNowOnly && placesDisplay.list.length > 0 && finalPlacesList.length === 0 && (
                <EmptyResults
                  title="Rien d'ouvert pour l'instant"
                  description="Aucun lieu n'est ouvert en ce moment. Retirez « Ouvert maintenant » pour tout voir."
                  actions={[{ label: "Voir tous les lieux", primary: true, onClick: () => filters.setOpenNowOnly(false) }]}
                />
              )}
              {finalPlacesList.length > 0 && (
                <div className="grid grid-cols-1 gap-y-3.5 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-7 lg:grid-cols-4">
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
              {hasMorePlaces && (
                <div ref={placesSentinelRef} className="flex justify-center py-2">
                  {loadingMorePlaces && <p className="text-xs text-gray-500">Chargement…</p>}
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
                <div className="grid grid-cols-1 gap-y-3.5 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-7 lg:grid-cols-4">
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
                <EmptyResults
                  title={emptyEventsReason ? "Rien ne correspond" : "Rien à afficher pour l'instant"}
                  description={emptyEventsReason ? "Essayez une autre date, ou retirez un filtre." : undefined}
                  actions={emptyEventsReason ? emptyActions() : []}
                />
              )}
              {((hasMorePlaces && !loadingMorePlaces) || (hasMoreEvents && !loadingMoreEvents)) && (
                <div ref={mergedSentinelRef} className="flex justify-center py-2">
                  {(loadingMorePlaces || loadingMoreEvents) && (
                    <p className="text-xs text-gray-500">Chargement…</p>
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
