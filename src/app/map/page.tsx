import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAllPlaces, getUpcomingEvents } from "@/lib/queries";
import { FullScreenMap } from "@/components/FullScreenMap";

// Streamed immediately while MapData's query is still in flight below —
// same background tone as the map's own client-side dynamic-import
// placeholder (see FullScreenMap.tsx) and the same flex sizing as
// FullScreenMap's own root div, so swapping the fallback for the real
// content causes neither a color flash nor a layout shift.
function MapPageSkeleton() {
  return <div className="relative min-h-0 flex-1" style={{ background: "#f2efe6" }} />;
}

// Split out from the page component itself so the `await` below suspends
// only this nested component, not the whole route — see the fix note in
// MapPage. `<Suspense>` can only stream a fallback around a component that
// actually throws/suspends during render; a plain top-level `await` in the
// page component blocks Next from sending anything (not even the fallback)
// until it resolves.
async function MapData() {
  const supabase = await createClient();
  const [places, events] = await Promise.all([
    getAllPlaces(supabase),
    getUpcomingEvents(supabase),
  ]);

  return <FullScreenMap places={places} events={events} />;
}

// Deliberately synchronous, not `async function MapPage()` — the previous
// version awaited the places/events query directly in this component,
// *above* its own <Suspense> boundary. Next can't stream a Suspense
// fallback until the component containing the `await` finishes, so despite
// the Suspense wrapper being present, the whole page still sat blank
// (a plain white tab) for however long that DB round-trip took, on every
// single visit to /map. Moving the fetch into MapData below fixes that:
// the skeleton now streams instantly, and the map's own chrome (search bar,
// filter button) plus the loading placeholder appear right away instead of
// after a network round-trip nobody could see happening.
export default function MapPage() {
  return (
    <>
      {/* Visually hidden — the map itself is the real content here, but a
          page with zero headings gives a screen-reader user nothing to
          land on and no page-level SEO signal. Outside the Suspense so it's
          present immediately, not delayed behind the places/events fetch. */}
      <h1 className="sr-only">Carte des lieux et événements à Lille</h1>
      <Suspense fallback={<MapPageSkeleton />}>
        <MapData />
      </Suspense>
    </>
  );
}
