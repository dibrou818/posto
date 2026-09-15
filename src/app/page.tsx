import { createClient } from "@/lib/supabase/server";
import { getPlacesPage, getUpcomingEventsPage } from "@/lib/queries";
import { EXPLORE_PAGE_SIZE } from "@/lib/explore";
import { HomeExplorer } from "@/components/HomeExplorer";

// Only the first page of each list is fetched here — HomeExplorer grows
// both lists client-side via "Voir plus" (see src/app/actions/explore.ts)
// instead of this route ever fetching the whole catalog (every place,
// every upcoming event) on a plain page load.
export default async function HomePage() {
  const supabase = await createClient();
  const [places, events] = await Promise.all([
    getPlacesPage(supabase, { limit: EXPLORE_PAGE_SIZE, offset: 0 }),
    getUpcomingEventsPage(supabase, { limit: EXPLORE_PAGE_SIZE, offset: 0 }),
  ]);

  return <HomeExplorer initialPlaces={places} initialEvents={events} />;
}
