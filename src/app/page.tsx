import { createClient } from "@/lib/supabase/server";
import {
  getAllTags,
  getPlacesPage,
  getUpcomingEventsForPlaces,
  getUpcomingEventsPage,
} from "@/lib/queries";
import { EXPLORE_PAGE_SIZE } from "@/lib/explore";
import { HomeExplorer } from "@/components/HomeExplorer";

// Only the first page of each list is fetched here — HomeExplorer grows
// both lists client-side via "Voir plus" (see src/app/actions/explore.ts)
// instead of this route ever fetching the whole catalog (every place,
// every upcoming event) on a plain page load.
const FOR_YOU_LIMIT = 6;

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [places, events, tags, follows] = await Promise.all([
    getPlacesPage(supabase, { limit: EXPLORE_PAGE_SIZE, offset: 0 }),
    getUpcomingEventsPage(supabase, { limit: EXPLORE_PAGE_SIZE, offset: 0 }),
    getAllTags(supabase),
    user
      ? supabase.from("place_follows").select("place_id").eq("user_id", user.id)
      : Promise.resolve({ data: null }),
  ]);

  // "Pour vous": what's coming up at the places this visitor follows.
  const followedIds = (follows.data ?? []).map((row) => row.place_id);
  const forYou = await getUpcomingEventsForPlaces(supabase, followedIds, FOR_YOU_LIMIT);

  return <HomeExplorer initialPlaces={places} initialEvents={events} allTags={tags} forYou={forYou} />;
}
