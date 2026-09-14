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
