"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, requireUser } from "@/lib/supabase/server";

async function assertOwnsPlace(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  placeId: string,
) {
  const { data, error } = await supabase
    .from("places")
    .select("owner_id")
    .eq("id", placeId)
    .single();
  if (error || !data || data.owner_id !== userId) {
    throw new Error("Vous n'êtes pas propriétaire de ce lieu.");
  }
}

function textField(formData: FormData, key: string): string | null {
  return String(formData.get(key) ?? "").trim() || null;
}

function parsePlaceFields(formData: FormData) {
  const name = textField(formData, "name");
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));

  if (!name || Number.isNaN(lat) || Number.isNaN(lng)) {
    throw new Error("Nom, latitude et longitude sont requis.");
  }

  return {
    name,
    lat,
    lng,
    description: textField(formData, "description"),
    address: textField(formData, "address"),
    cover_photo_url: textField(formData, "cover_photo_url"),
  };
}

export async function createPlace(formData: FormData) {
  const { supabase, user } = await requireUser();
  const fields = parsePlaceFields(formData);

  const { data, error } = await supabase
    .from("places")
    .insert({ ...fields, owner_id: user.id })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  redirect(`/dashboard/places/${data.id}`);
}

export async function updatePlace(placeId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  await assertOwnsPlace(supabase, user.id, placeId);
  const fields = parsePlaceFields(formData);

  const { error } = await supabase.from("places").update(fields).eq("id", placeId);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/places/${placeId}`);
  revalidatePath("/dashboard");
}

export async function deletePlace(placeId: string) {
  const { supabase, user } = await requireUser();
  await assertOwnsPlace(supabase, user.id, placeId);

  const { error } = await supabase.from("places").delete().eq("id", placeId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function saveOpeningHours(placeId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  await assertOwnsPlace(supabase, user.id, placeId);

  const rows: { place_id: string; day_of_week: number; open_time: string; close_time: string }[] = [];
  for (let day = 0; day < 7; day++) {
    const isOpen = formData.get(`open_${day}`) === "on";
    if (!isOpen) continue;
    const open_time = String(formData.get(`open_time_${day}`) ?? "");
    const close_time = String(formData.get(`close_time_${day}`) ?? "");
    if (!open_time || !close_time) continue;
    rows.push({ place_id: placeId, day_of_week: day, open_time, close_time });
  }

  const { error: deleteError } = await supabase
    .from("opening_hours")
    .delete()
    .eq("place_id", placeId);
  if (deleteError) throw new Error(deleteError.message);

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from("opening_hours").insert(rows);
    if (insertError) throw new Error(insertError.message);
  }

  revalidatePath(`/dashboard/places/${placeId}`);
}

export async function savePlaceTags(placeId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  await assertOwnsPlace(supabase, user.id, placeId);

  const tagIds = formData.getAll("tag_ids").map(String);

  const { error: deleteError } = await supabase
    .from("place_tags")
    .delete()
    .eq("place_id", placeId);
  if (deleteError) throw new Error(deleteError.message);

  if (tagIds.length > 0) {
    const { error: insertError } = await supabase
      .from("place_tags")
      .insert(tagIds.map((tag_id) => ({ place_id: placeId, tag_id })));
    if (insertError) throw new Error(insertError.message);
  }

  revalidatePath(`/dashboard/places/${placeId}`);
}

export async function createActivity(placeId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  await assertOwnsPlace(supabase, user.id, placeId);

  const name = textField(formData, "name");
  const description = textField(formData, "description");
  const tag_id = textField(formData, "tag_id");

  if (!name) throw new Error("Le nom de l'activité est requis.");

  const { error } = await supabase
    .from("activities")
    .insert({ place_id: placeId, name, description, tag_id });
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/places/${placeId}`);
}

export async function deleteActivity(placeId: string, activityId: string) {
  const { supabase, user } = await requireUser();
  await assertOwnsPlace(supabase, user.id, placeId);

  const { error } = await supabase.from("activities").delete().eq("id", activityId);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/places/${placeId}`);
}

export async function createEvent(placeId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  await assertOwnsPlace(supabase, user.id, placeId);

  const title = textField(formData, "title");
  const description = textField(formData, "description");
  const start_datetime = textField(formData, "start_datetime");
  const end_datetime = textField(formData, "end_datetime");
  const recurrence_rule = textField(formData, "recurrence_rule");
  const tag_id = textField(formData, "tag_id");

  if (!title || !start_datetime) {
    throw new Error("Titre et date de début sont requis.");
  }

  const { error } = await supabase.from("events").insert({
    place_id: placeId,
    title,
    description,
    start_datetime: new Date(start_datetime).toISOString(),
    end_datetime: end_datetime ? new Date(end_datetime).toISOString() : null,
    recurrence_rule,
    tag_id,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/places/${placeId}`);
}

export async function deleteEvent(placeId: string, eventId: string) {
  const { supabase, user } = await requireUser();
  await assertOwnsPlace(supabase, user.id, placeId);

  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/places/${placeId}`);
}
