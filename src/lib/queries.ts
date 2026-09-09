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

  if (error) throw error;
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

  if (error) throw error;
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
  if (error) throw error;
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
  if (error) throw error;
  return data;
}

export type EventWithPlace = Event & { place: Tables<"places"> };

export async function getEventById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<EventWithPlace | null> {
  const { data, error } = await supabase
    .from("events")
    .select("*, place:places(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return data as unknown as EventWithPlace;
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
  if (error) throw error;
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
  if (error) throw error;
  return (data as unknown as RawPlace[]).map(normalizePlace);
}

export async function getAllTags(
  supabase: SupabaseClient<Database>,
): Promise<Tag[]> {
  const { data, error } = await supabase.from("tags").select("*").order("label");
  if (error) throw error;
  return data;
}
