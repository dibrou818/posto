import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/types/database.types";

export type Tag = Tables<"tags">;
export type OpeningHour = Tables<"opening_hours">;
export type Activity = Tables<"activities">;
export type Event = Tables<"events">;

export type PlaceWithRelations = Tables<"places"> & {
  tags: Tag[];
  opening_hours: OpeningHour[];
};

const PLACE_SELECT = "*, place_tags(tags(*)), opening_hours(*)";

type RawPlace = Tables<"places"> & {
  place_tags: { tags: Tag | null }[];
  opening_hours: OpeningHour[];
};

function normalizePlace(raw: RawPlace): PlaceWithRelations {
  const { place_tags, ...rest } = raw;
  return {
    ...rest,
    opening_hours: raw.opening_hours,
    tags: place_tags.map((pt) => pt.tags).filter((t): t is Tag => t !== null),
  };
}

export async function getAllPlaces(
  supabase: SupabaseClient<Database>,
): Promise<PlaceWithRelations[]> {
  const { data, error } = await supabase
    .from("places")
    .select(PLACE_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as unknown as RawPlace[]).map(normalizePlace);
}

/** One page of places, same primary order as getAllPlaces — used by the
 * home page's "Voir plus" pagination instead of getAllPlaces itself, which
 * fetches every place in the database in one call. /map still uses
 * getAllPlaces on purpose (a map needs every pin at once, clustering is
 * what keeps *that* screen readable at scale — pagination doesn't apply
 * there).
 *
 * `.order("id")` as a tiebreaker matters here in a way it didn't for
 * getAllPlaces: `created_at` alone isn't unique (seed data in particular
 * tends to share the exact same timestamp across many rows), so two
 * separate `.range()` calls over an otherwise-identically-sorted set can
 * come back in a different relative order for those tied rows — the same
 * place then shows up on two pages while another silently never does. A
 * single one-shot fetch never surfaces that; paginating over multiple
 * requests does. */
export async function getPlacesPage(
  supabase: SupabaseClient<Database>,
  { limit, offset }: { limit: number; offset: number },
): Promise<PlaceWithRelations[]> {
  const { data, error } = await supabase
    .from("places")
    .select(PLACE_SELECT)
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);
  return (data as unknown as RawPlace[]).map(normalizePlace);
}

export async function getPlaceById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<PlaceWithRelations | null> {
  const { data, error } = await supabase
    .from("places")
    .select(PLACE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return normalizePlace(data as unknown as RawPlace);
}

export async function getActivitiesForPlace(
  supabase: SupabaseClient<Database>,
  placeId: string,
): Promise<Activity[]> {
  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("place_id", placeId)
    .order("name");
  if (error) throw new Error(error.message);
  return data;
}

export async function getUpcomingEventsForPlace(
  supabase: SupabaseClient<Database>,
  placeId: string,
): Promise<Event[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("place_id", placeId)
    .gte("start_datetime", new Date().toISOString())
    .order("start_datetime");
  if (error) throw new Error(error.message);
  return data;
}

// Nests the same place_tags(tags(*)) relation PLACE_SELECT uses, not just
// the bare place row — an event with no tag_id of its own is meant to
// "inherit" its place's tags (that's literally what the dashboard's own
// tag <select> says when left empty), and the tag filter on the home page
// and map (see eventMatchesTag in lib/eventTags.ts) needs the place's real
// tags in hand to actually honor that instead of just the UI copy claiming
// it.
const EVENT_SELECT = `*, place:places(${PLACE_SELECT})`;

export type EventWithPlace = Event & { place: PlaceWithRelations };

type RawEventWithPlace = Event & { place: RawPlace };

function normalizeEvent(raw: RawEventWithPlace): EventWithPlace {
  return { ...raw, place: normalizePlace(raw.place) };
}

export async function getEventById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<EventWithPlace | null> {
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return normalizeEvent(data as unknown as RawEventWithPlace);
}

export async function getUpcomingEvents(
  supabase: SupabaseClient<Database>,
): Promise<EventWithPlace[]> {
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .gte("start_datetime", new Date().toISOString())
    .order("start_datetime")
    .limit(60);
  if (error) throw new Error(error.message);
  return (data as unknown as RawEventWithPlace[]).map(normalizeEvent);
}

/** One page of upcoming events, same order/filter as getUpcomingEvents —
 * used by the home page's "Voir plus" pagination. getUpcomingEvents' own
 * `.limit(60)` was already a soft cap against fetching literally every
 * future event, but 60 is still everything-at-once from the browser's
 * perspective; this fetches a real page at a time instead. /map keeps using
 * getUpcomingEvents (same reasoning as getPlacesPage above).
 *
 * `.order("id")` as a tiebreaker: same reasoning as getPlacesPage —
 * start_datetime alone isn't unique (several seed events share an exact
 * timestamp), and an unstable tie order across separate paginated requests
 * is exactly what produced a real duplicate-key bug in testing (the same
 * event on two pages, another skipped entirely). */
export async function getUpcomingEventsPage(
  supabase: SupabaseClient<Database>,
  { limit, offset }: { limit: number; offset: number },
): Promise<EventWithPlace[]> {
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .gte("start_datetime", new Date().toISOString())
    .order("start_datetime")
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);
  return (data as unknown as RawEventWithPlace[]).map(normalizeEvent);
}

export async function getAllEventsForPlace(
  supabase: SupabaseClient<Database>,
  placeId: string,
): Promise<Event[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("place_id", placeId)
    .order("start_datetime", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function getPlacesByOwner(
  supabase: SupabaseClient<Database>,
  ownerId: string,
): Promise<PlaceWithRelations[]> {
  const { data, error } = await supabase
    .from("places")
    .select(PLACE_SELECT)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as RawPlace[]).map(normalizePlace);
}

export async function getAllTags(
  supabase: SupabaseClient<Database>,
): Promise<Tag[]> {
  const { data, error } = await supabase.from("tags").select("*").order("label");
  if (error) throw new Error(error.message);
  return data;
}
