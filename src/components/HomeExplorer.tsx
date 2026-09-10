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

export function HomeExplorer({
  places,
  events,
}: {
  places: PlaceWithRelations[];
  events: EventWithPlace[];
}) {
  const router = useRouter();
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationFilter, setLocationFilter] = useState<LocationFilterValue | null>(null);
  const [kindFilter, setKindFilter] = useState<ResultKindFilter>("all");

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
    () => (selectedTag ? events.filter((e) => e.tag_id === selectedTag.id) : events),
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

  const showPlaces = kindFilter !== "event";
  const showEvents = kindFilter !== "place";

  function placesHeading() {
    if (selectedTag) return `Lieux taggés ${selectedTag.label}`;
    if (locationFilter) return `Lieux près de ${locationFilter.label}`;
    return "Tous les lieux";
  }

  function eventsHeading() {
    if (selectedTag) return `Événements taggés ${selectedTag.label}`;
    if (locationFilter) return `Événements près de ${locationFilter.label}`;
    return "Événements à venir";
  }

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

  // Never leave the user looking at a blank section: if nothing matches
  // the active filters, fall back one step at a time (drop the distance
  // cap, then the tag) until something can be shown — always labeled
  // clearly so it's obvious these aren't exact matches. Only a genuinely
  // empty database ends up with nothing to fall back to.
  const placesDisplay = useMemo(() => {
    if (visiblePlaces.length > 0) return { list: visiblePlaces, note: null as string | null };
    if (sortedPlaces.length > 0) {
      return {
        list: sortedPlaces.slice(0, FALLBACK_COUNT),
        note: `Aucun lieu dans cette zone — voici les plus proches :`,
      };
    }
    if (places.length > 0) {
      return {
        list: sortByDistance(places).slice(0, FALLBACK_COUNT),
        note: "Aucun lieu avec ce tag — voici tous les lieux :",
      };
    }
    return { list: [], note: "Aucun lieu pour l'instant." };
  }, [visiblePlaces, sortedPlaces, places, sortByDistance]);

  const eventsDisplay = useMemo(() => {
    if (visibleEvents.length > 0) return { list: visibleEvents, note: null as string | null };
    if (tagFilteredEvents.length > 0) {
      return {
        list: sortByDistance(tagFilteredEvents.map((e) => ({ ...e, lat: e.place.lat, lng: e.place.lng }))).slice(
          0,
          FALLBACK_COUNT,
        ),
        note: "Aucun événement dans cette zone — voici les plus proches :",
      };
    }
    if (events.length > 0) {
      return {
        list: sortByDistance(events.map((e) => ({ ...e, lat: e.place.lat, lng: e.place.lng }))).slice(
          0,
          FALLBACK_COUNT,
        ),
        note: "Aucun événement avec ce tag — voici tous les événements à venir :",
      };
    }
    return { list: [], note: "Aucun événement à venir pour l'instant." };
  }, [visibleEvents, tagFilteredEvents, events, sortByDistance]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <LocationWeather onLocated={setUserLocation} onCityResolved={handleCityResolved} />

      <div className="flex flex-col gap-2">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <SearchBar
              onSelectTag={setSelectedTag}
              onSelectResult={(r) =>
                router.push(r.result_type === "event" ? `/events/${r.id}` : `/places/${r.place_id}`)
              }
              onSelectCity={(city) => router.push(`/map?lat=${city.lat}&lng=${city.lng}`)}
              filter={kindFilter}
              onFilterChange={setKindFilter}
            />
          </div>
          {/* Wraps to its own line rather than forcing the page to overflow
              horizontally when both filters don't fit next to a long city name. */}
          <div className="flex flex-wrap items-center gap-2">
            <KindFilter value={kindFilter} onChange={setKindFilter} />
            <LocationFilter value={locationFilter} onChange={setLocationFilter} />
          </div>
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
        {showPlaces && (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-gray-900">{placesHeading()}</h2>
            {placesDisplay.note && (
              <p className="text-sm text-gray-500">{placesDisplay.note}</p>
            )}
            {placesDisplay.list.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {placesDisplay.list.map((place) => (
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
          </section>
        )}

        {showEvents && (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-gray-900">{eventsHeading()}</h2>
            {eventsDisplay.note && (
              <p className="text-sm text-gray-500">{eventsDisplay.note}</p>
            )}
            {eventsDisplay.list.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {eventsDisplay.list.map((event) => (
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
          </section>
        )}
      </div>
    </div>
  );
}
