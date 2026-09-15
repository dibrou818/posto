"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { generateQrCodeDataUrl } from "@/lib/qrcode";
import { PLACE_PHOTOS_BUCKET } from "@/lib/storage";
import { PLACE_NAME_MAX_LENGTH, PLACE_DESCRIPTION_MAX_LENGTH, URGENT_MESSAGE_MAX_LENGTH } from "@/lib/fieldLimits";
import {
  assertOwnsPlace,
  textField,
  textFieldLimited,
  parseCoverPhotoUrl,
  parsePhotoUrls,
  parseUrlField,
  storagePathFromPublicUrl,
  getSiteOrigin,
} from "./shared";

function parseUrgentMessageExpiry(formData: FormData): string | null {
  const value = textField(formData, "urgent_message_expires_at");
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Date d'expiration invalide.");
  return date.toISOString();
}

function parsePlaceFields(formData: FormData) {
  const name = textFieldLimited(formData, "name", PLACE_NAME_MAX_LENGTH, "Nom du lieu");
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));

  if (!name || Number.isNaN(lat) || Number.isNaN(lng)) {
    throw new Error("Nom, latitude et longitude sont requis.");
  }

  return {
    name,
    lat,
    lng,
    description: textFieldLimited(formData, "description", PLACE_DESCRIPTION_MAX_LENGTH, "Description"),
    address: textField(formData, "address"),
    // Structured alongside the free-text address, both filled by the same
    // "Localiser" geocode call (see PlaceForm) — not shown/edited directly,
    // just carried through so future features (browse by city/quartier)
    // have real data instead of starting from nothing.
    city: textField(formData, "city"),
    postcode: textField(formData, "postcode"),
    suburb: textField(formData, "suburb"),
    phone: textField(formData, "phone"),
    cover_photo_url: parseCoverPhotoUrl(formData),
    photo_urls: parsePhotoUrls(formData),
    website_url: parseUrlField(formData, "website_url", "URL du site web"),
    instagram_url: parseUrlField(formData, "instagram_url", "URL Instagram"),
    facebook_url: parseUrlField(formData, "facebook_url", "URL Facebook"),
    urgent_message: textFieldLimited(formData, "urgent_message", URGENT_MESSAGE_MAX_LENGTH, "Message urgent"),
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
  redirect(`/dashboard/places/${data.id}/informations?created=1`);
}

export async function updatePlace(placeId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  await assertOwnsPlace(supabase, user.id, placeId);
  const fields = parsePlaceFields(formData);

  // Fetched *before* the update, so this still has the photos about to be
  // replaced/dropped — same "read the old value first" shape as
  // saveEventPoster/deleteEventPoster's own cleanup.
  const { data: existing } = await supabase
    .from("places")
    .select("cover_photo_url, photo_urls")
    .eq("id", placeId)
    .maybeSingle();

  const { error } = await supabase.from("places").update(fields).eq("id", placeId);
  if (error) throw new Error(error.message);

  // A cover photo swapped for a new one, or a gallery photo the owner
  // removed, otherwise leaves its old file behind in Storage forever —
  // exactly what saveEventPoster/deleteEventPoster already avoid for
  // posters, just not applied here until now. storagePathFromPublicUrl
  // quietly returns null for a URL that was never ours (an Unsplash/Picsum
  // photo on a demo place), so there's nothing to remove for those.
  const droppedUrls = [
    existing?.cover_photo_url && existing.cover_photo_url !== fields.cover_photo_url ? existing.cover_photo_url : null,
    ...(existing?.photo_urls ?? []).filter((url) => !fields.photo_urls.includes(url)),
  ].filter((url): url is string => Boolean(url));
  const droppedPaths = droppedUrls.map(storagePathFromPublicUrl).filter((path): path is string => Boolean(path));
  if (droppedPaths.length > 0) {
    await supabase.storage.from(PLACE_PHOTOS_BUCKET).remove(droppedPaths);
  }

  revalidatePath(`/dashboard/places/${placeId}/informations`);
  revalidatePath("/dashboard");
}

export async function generatePlaceQrCode(placeId: string) {
  const { supabase, user } = await requireUser();
  await assertOwnsPlace(supabase, user.id, placeId);

  // /places/<id> is keyed on the immutable id, never the name/address/etc,
  // so this QR stays valid for the life of the place no matter what its
  // owner edits afterwards — no need to ever regenerate it after this.
  // ?src=qr is what lets the page tell "someone scanned the printed code"
  // apart from "someone clicked a shared link" (see recordQrScan) — a plain
  // link to the same page never carries this param, so it never counts.
  const origin = await getSiteOrigin();
  const qr_code_url = await generateQrCodeDataUrl(`${origin}/places/${placeId}?src=qr`);

  const { error } = await supabase.from("places").update({ qr_code_url }).eq("id", placeId);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/places/${placeId}/informations`);
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

  revalidatePath(`/dashboard/places/${placeId}/horaires`);
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

  revalidatePath(`/dashboard/places/${placeId}/informations`);
}
