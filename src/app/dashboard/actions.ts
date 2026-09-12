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

function validatePhotoUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("URL de photo invalide.");
  }
  if (url.protocol !== "https:" || !ALLOWED_PHOTO_HOSTS.includes(url.hostname)) {
    throw new Error("URL de photo non autorisée.");
  }
  return raw;
}

function parseCoverPhotoUrl(formData: FormData): string | null {
  const value = textField(formData, "cover_photo_url");
  return value ? validatePhotoUrl(value) : null;
}

// The gallery form field (see PlaceForm) submits one "photo_urls" entry per
// uploaded photo — same upload flow/bucket as the cover photo, so the same
// host allowlist applies to each one individually.
function parsePhotoUrls(formData: FormData): string[] {
  return formData.getAll("photo_urls").map(String).filter(Boolean).map(validatePhotoUrl);
}

// Shared by activities and events — both got a "durée typique" field with
// the same shape and the same validation needs.
function parseDurationMinutes(formData: FormData, key: string): number | null {
  const raw = textField(formData, key);
  if (!raw) return null;
  const minutes = Number(raw);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw new Error("Durée invalide.");
  }
  return Math.round(minutes);
}

function parseUrlField(formData: FormData, key: string, label: string): string | null {
  const raw = textField(formData, key);
  if (!raw) return null;
  // Owners will type "instagram.com/monbar" without a scheme far more often
  // than they'll type the full "https://..." — filling it in rather than
  // rejecting the field avoids a confusing validation error for the common
  // case.
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    return new URL(withScheme).toString();
  } catch {
    throw new Error(`${label} invalide.`);
  }
}

// A generated poster is always our own upload, never a third-party URL like
// a cover photo can be — so unlike ALLOWED_PHOTO_HOSTS above, this is
// scoped to exactly one bucket, not a general allowlist.
const SUPABASE_STORAGE_HOST = "khvchawnkzamhfwrbhtz.supabase.co";
const POSTER_BUCKET = "place-photos";
const POSTER_PATH_PREFIX = `/storage/v1/object/public/${POSTER_BUCKET}/`;

// The client posts back the public URL it just uploaded to (see
// PosterSection) — re-validated here rather than trusted outright, same
// reasoning as parseCoverPhotoUrl: nothing stops a signed-in owner from
// calling this action directly with an arbitrary URL otherwise.
function parsePosterUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("URL d'affiche invalide.");
  }
  if (url.protocol !== "https:" || url.hostname !== SUPABASE_STORAGE_HOST || !url.pathname.startsWith(POSTER_PATH_PREFIX)) {
    throw new Error("URL d'affiche non autorisée.");
  }
  return rawUrl;
}

function storagePathFromPosterUrl(posterUrl: string): string | null {
  try {
    const url = new URL(posterUrl);
    if (!url.pathname.startsWith(POSTER_PATH_PREFIX)) return null;
    return decodeURIComponent(url.pathname.slice(POSTER_PATH_PREFIX.length));
  } catch {
    return null;
  }
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
    photo_urls: parsePhotoUrls(formData),
    website_url: parseUrlField(formData, "website_url", "URL du site web"),
    instagram_url: parseUrlField(formData, "instagram_url", "URL Instagram"),
    facebook_url: parseUrlField(formData, "facebook_url", "URL Facebook"),
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

// Zone 0 is always the place's general hours (zone_name null); each
// "zone_names" entry submitted (see OpeningHoursForm) adds one more named
// sub-schedule at zones[1], zones[2], etc — day-row field names carry that
// same index as a suffix (open_<zoneIndex>_<day>) so one flat FormData can
// carry an arbitrary number of zones without guessing at gaps.
export async function saveOpeningHours(placeId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  await assertOwnsPlace(supabase, user.id, placeId);

  const zoneNames = formData.getAll("zone_names").map(String);
  const allZones: (string | null)[] = [null, ...zoneNames];

  const rows: { place_id: string; day_of_week: number; open_time: string; close_time: string; zone_name: string | null }[] = [];
  allZones.forEach((zoneName, zoneIndex) => {
    for (let day = 0; day < 7; day++) {
      const isOpen = formData.get(`open_${zoneIndex}_${day}`) === "on";
      if (!isOpen) continue;
      const open_time = String(formData.get(`open_time_${zoneIndex}_${day}`) ?? "");
      const close_time = String(formData.get(`close_time_${zoneIndex}_${day}`) ?? "");
      if (!open_time || !close_time) continue;
      rows.push({ place_id: placeId, day_of_week: day, open_time, close_time, zone_name: zoneName });
    }
  });

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
  const duration_minutes = parseDurationMinutes(formData, "duration_minutes");
  const restrictions = textField(formData, "restrictions");

  if (!name) throw new Error("Le nom de l'activité est requis.");

  const { error } = await supabase
    .from("activities")
    .insert({ place_id: placeId, name, description, tag_id, duration_minutes, restrictions });
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
  const duration_minutes = parseDurationMinutes(formData, "duration_minutes");
  const restrictions = textField(formData, "restrictions");

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
    duration_minutes,
    restrictions,
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

// The poster image itself is composited client-side (canvas — see
// src/lib/poster.ts, no browser-free way to do that in a server action) and
// uploaded straight to Storage from there; this just validates and persists
// the resulting URL, mirroring how PlaceForm's cover-photo upload hands a
// URL back to createPlace/updatePlace rather than uploading itself.
export async function saveEventPoster(placeId: string, eventId: string, posterUrl: string) {
  const { supabase, user } = await requireUser();
  await assertOwnsPlace(supabase, user.id, placeId);
  const validatedUrl = parsePosterUrl(posterUrl);

  const { data: existing } = await supabase
    .from("events")
    .select("poster_url")
    .eq("id", eventId)
    .eq("place_id", placeId)
    .maybeSingle();

  const { error, count } = await supabase
    .from("events")
    .update({ poster_url: validatedUrl }, { count: "exact" })
    .eq("id", eventId)
    .eq("place_id", placeId);
  if (error) throw new Error(error.message);
  if (!count) throw new Error("Cet événement n'appartient pas à ce lieu.");

  // Regenerating replaces the file at a new path (see PosterSection) — the
  // old upload is now orphaned in Storage unless cleaned up here.
  const previousPath = existing?.poster_url ? storagePathFromPosterUrl(existing.poster_url) : null;
  if (previousPath) {
    await supabase.storage.from(POSTER_BUCKET).remove([previousPath]);
  }

  revalidatePath(`/dashboard/places/${placeId}`);
}

export async function deleteEventPoster(placeId: string, eventId: string) {
  const { supabase, user } = await requireUser();
  await assertOwnsPlace(supabase, user.id, placeId);

  const { data: existing, error: fetchError } = await supabase
    .from("events")
    .select("poster_url")
    .eq("id", eventId)
    .eq("place_id", placeId)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);

  const { error, count } = await supabase
    .from("events")
    .update({ poster_url: null }, { count: "exact" })
    .eq("id", eventId)
    .eq("place_id", placeId);
  if (error) throw new Error(error.message);
  if (!count) throw new Error("Cet événement n'appartient pas à ce lieu.");

  const path = existing?.poster_url ? storagePathFromPosterUrl(existing.poster_url) : null;
  if (path) {
    await supabase.storage.from(POSTER_BUCKET).remove([path]);
  }

  revalidatePath(`/dashboard/places/${placeId}`);
}
