"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient, requireUser } from "@/lib/supabase/server";
import { generateQrCodeDataUrl } from "@/lib/qrcode";

/** Derives the current deployment's origin from the incoming request's own
 * headers, so QR codes always point at wherever the app is actually running
 * (localhost in dev, the real domain in prod) without a hardcoded env var. */
async function getSiteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

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

// Keep in sync with images.remotePatterns in next.config.ts — a place owner
// could otherwise submit this action directly (bypassing the upload flow in
// PlaceForm) with an arbitrary URL in the hidden cover_photo_url field.
const ALLOWED_PHOTO_HOSTS = ["images.unsplash.com", "picsum.photos", "khvchawnkzamhfwrbhtz.supabase.co"];

function parseCoverPhotoUrl(formData: FormData): string | null {
  const value = textField(formData, "cover_photo_url");
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("URL de photo invalide.");
  }
  if (url.protocol !== "https:" || !ALLOWED_PHOTO_HOSTS.includes(url.hostname)) {
    throw new Error("URL de photo non autorisée.");
  }
  return value;
}

function parseUrgentMessageExpiry(formData: FormData): string | null {
  const value = textField(formData, "urgent_message_expires_at");
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Date d'expiration invalide.");
  return date.toISOString();
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
    phone: textField(formData, "phone"),
    cover_photo_url: parseCoverPhotoUrl(formData),
    urgent_message: textField(formData, "urgent_message"),
    urgent_message_expires_at: parseUrgentMessageExpiry(formData),
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
  redirect(`/dashboard/places/${data.id}?created=1`);
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

export async function generatePlaceQrCode(placeId: string) {
  const { supabase, user } = await requireUser();
  await assertOwnsPlace(supabase, user.id, placeId);

  // /places/<id> is keyed on the immutable id, never the name/address/etc,
  // so this QR stays valid for the life of the place no matter what its
  // owner edits afterwards — no need to ever regenerate it after this.
  const origin = await getSiteOrigin();
  const qr_code_url = await generateQrCodeDataUrl(`${origin}/places/${placeId}`);

  const { error } = await supabase.from("places").update({ qr_code_url }).eq("id", placeId);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/places/${placeId}`);
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

  // Re-scope by place_id too, not just id: assertOwnsPlace only proves the
  // caller owns `placeId` — without this, nothing here actually confirms
  // `activityId` belongs to that place rather than someone else's. RLS also
  // blocks a mismatched delete, but the app-level check should be correct on
  // its own rather than depending entirely on that second layer.
  const { error, count } = await supabase
    .from("activities")
    .delete({ count: "exact" })
    .eq("id", activityId)
    .eq("place_id", placeId);
  if (error) throw new Error(error.message);
  if (!count) throw new Error("Cette activité n'appartient pas à ce lieu.");

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
  const price = textField(formData, "price");
  const cover_photo_url = parseCoverPhotoUrl(formData);

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
    price,
    cover_photo_url,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/places/${placeId}`);
}

export async function generateEventQrCode(placeId: string, eventId: string) {
  const { supabase, user } = await requireUser();
  await assertOwnsPlace(supabase, user.id, placeId);

  // Same reasoning as generatePlaceQrCode: /events/<id> never changes even
  // if the event's title/date/description get edited later.
  const origin = await getSiteOrigin();
  const qr_code_url = await generateQrCodeDataUrl(`${origin}/events/${eventId}`);

  const { error, count } = await supabase
    .from("events")
    .update({ qr_code_url }, { count: "exact" })
    .eq("id", eventId)
    .eq("place_id", placeId);
  if (error) throw new Error(error.message);
  if (!count) throw new Error("Cet événement n'appartient pas à ce lieu.");

  revalidatePath(`/dashboard/places/${placeId}`);
}

export async function deleteEvent(placeId: string, eventId: string) {
  const { supabase, user } = await requireUser();
  await assertOwnsPlace(supabase, user.id, placeId);

  // Same reasoning as deleteActivity above: re-scope by place_id, don't rely
  // on RLS alone to catch a mismatched id.
  const { error, count } = await supabase
    .from("events")
    .delete({ count: "exact" })
    .eq("id", eventId)
    .eq("place_id", placeId);
  if (error) throw new Error(error.message);
  if (!count) throw new Error("Cet événement n'appartient pas à ce lieu.");

  revalidatePath(`/dashboard/places/${placeId}`);
}
