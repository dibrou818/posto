"use client";

import { useMemo, useState } from "react";
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

  const visibleEvents = useMemo(() => {
    let list = selectedTag ? events.filter((e) => e.tag_id === selectedTag.id) : events;
    if (locationFilter) {
      list = list.filter(
        (e) =>
          haversineKm(locationFilter.lat, locationFilter.lng, e.place.lat, e.place.lng) <=
          LOCATION_FILTER_RADIUS_KM,
      );
    }
    return list;
  }, [events, selectedTag, locationFilter]);

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
            {visiblePlaces.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visiblePlaces.map((place) => (
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
            ) : (
              <p className="text-sm text-gray-500">
                {locationFilter
                  ? `Aucun lieu à moins de ${LOCATION_FILTER_RADIUS_KM} km de ${locationFilter.label}.`
                  : "Aucun lieu pour l'instant."}
              </p>
            )}
          </section>
        )}

        {showEvents && (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-gray-900">{eventsHeading()}</h2>
            {visibleEvents.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visibleEvents.map((event) => (
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
            ) : (
              <p className="text-sm text-gray-500">
                {locationFilter
                  ? `Aucun événement à moins de ${LOCATION_FILTER_RADIUS_KM} km de ${locationFilter.label}.`
                  : "Aucun événement à venir pour l'instant."}
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
