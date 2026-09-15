"use server";

import { createClient } from "@/lib/supabase/server";
import { getPlacesPage, getUpcomingEventsPage } from "@/lib/queries";
import { EXPLORE_PAGE_SIZE } from "@/lib/explore";

/** Next page of places for the home page's default (unfiltered) browse
 * view — public, no auth needed, same as every place already being public
 * data. */
export async function loadMorePlaces(offset: number) {
  const supabase = await createClient();
  return getPlacesPage(supabase, { limit: EXPLORE_PAGE_SIZE, offset });
}

/** Next page of upcoming events, same reasoning as loadMorePlaces. */
export async function loadMoreEvents(offset: number) {
  const supabase = await createClient();
  return getUpcomingEventsPage(supabase, { limit: EXPLORE_PAGE_SIZE, offset });
}
