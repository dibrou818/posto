"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { generateQrCodeDataUrl } from "@/lib/qrcode";
import { PLACE_PHOTOS_BUCKET } from "@/lib/storage";
import {
  EVENT_TITLE_MAX_LENGTH,
  EVENT_DESCRIPTION_MAX_LENGTH,
  EVENT_RECURRENCE_MAX_LENGTH,
  RESTRICTIONS_MAX_LENGTH,
} from "@/lib/fieldLimits";
import {
  assertOwnsPlace,
  textField,
  textFieldLimited,
  parseDurationMinutes,
  parseCoverPhotoUrl,
  storagePathFromPublicUrl,
  getSiteOrigin,
  SUPABASE_STORAGE_HOST,
  STORAGE_PUBLIC_PATH_PREFIX,
} from "./shared";

// PriceField (see components/ui/PriceField) submits these as two real
// columns, not a combined string — price_cents stays null when neither
// "Gratuit" nor an amount was entered ("prix non précisé", same as an
// empty old free-text `price`), 0 when "Gratuit" is checked.
const ALLOWED_PRICE_UNITS = ["personne", "equipe", "partie"];

function parsePriceCents(formData: FormData): number | null {
  const raw = textField(formData, "price_cents");
  if (!raw) return null;
  const cents = Number(raw);
  if (!Number.isInteger(cents) || cents < 0) {
    throw new Error("Prix invalide.");
  }
  return cents;
}

function parsePriceUnit(formData: FormData, priceCents: number | null): string | null {
  // A unit only means something alongside an actual (non-free) amount —
  // ignore whatever the field carries otherwise rather than trust the
  // client to have cleared it (PriceField already does, but this action
  // can be called directly).
  if (!priceCents) return null;
  const raw = textField(formData, "price_unit");
  if (!raw) return null;
  if (!ALLOWED_PRICE_UNITS.includes(raw)) throw new Error("Unité de prix invalide.");
  return raw;
}

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
  if (url.protocol !== "https:" || url.hostname !== SUPABASE_STORAGE_HOST || !url.pathname.startsWith(STORAGE_PUBLIC_PATH_PREFIX)) {
    throw new Error("URL d'affiche non autorisée.");
  }
  return rawUrl;
}

export async function createEvent(placeId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  await assertOwnsPlace(supabase, user.id, placeId);

  const title = textFieldLimited(formData, "title", EVENT_TITLE_MAX_LENGTH, "Titre");
  const description = textFieldLimited(formData, "description", EVENT_DESCRIPTION_MAX_LENGTH, "Description");
  const start_datetime = textField(formData, "start_datetime");
  const end_datetime = textField(formData, "end_datetime");
  const recurrence_rule = textFieldLimited(formData, "recurrence_rule", EVENT_RECURRENCE_MAX_LENGTH, "Récurrence");
  const tag_id = textField(formData, "tag_id");
  const price_cents = parsePriceCents(formData);
  const price_unit = parsePriceUnit(formData, price_cents);
  const cover_photo_url = parseCoverPhotoUrl(formData);
  const duration_minutes = parseDurationMinutes(formData, "duration_minutes");
  const restrictions = textFieldLimited(formData, "restrictions", RESTRICTIONS_MAX_LENGTH, "Restriction");

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
    price_cents,
    price_unit,
    cover_photo_url,
    duration_minutes,
    restrictions,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/places/${placeId}/evenements`);
}

// Same field set/validation as createEvent above — kept as two separate
// functions rather than one with an optional eventId because their DB calls
// genuinely differ (insert vs. re-scoped update), not just a detail worth
// branching on internally.
export async function updateEvent(placeId: string, eventId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  await assertOwnsPlace(supabase, user.id, placeId);

  const title = textFieldLimited(formData, "title", EVENT_TITLE_MAX_LENGTH, "Titre");
  const description = textFieldLimited(formData, "description", EVENT_DESCRIPTION_MAX_LENGTH, "Description");
  const start_datetime = textField(formData, "start_datetime");
  const end_datetime = textField(formData, "end_datetime");
  const recurrence_rule = textFieldLimited(formData, "recurrence_rule", EVENT_RECURRENCE_MAX_LENGTH, "Récurrence");
  const tag_id = textField(formData, "tag_id");
  const price_cents = parsePriceCents(formData);
  const price_unit = parsePriceUnit(formData, price_cents);
  const cover_photo_url = parseCoverPhotoUrl(formData);
  const duration_minutes = parseDurationMinutes(formData, "duration_minutes");
  const restrictions = textFieldLimited(formData, "restrictions", RESTRICTIONS_MAX_LENGTH, "Restriction");

  if (!title || !start_datetime) {
    throw new Error("Titre et date de début sont requis.");
  }

  const { error, count } = await supabase
    .from("events")
    .update(
      {
        title,
        description,
        start_datetime: new Date(start_datetime).toISOString(),
        end_datetime: end_datetime ? new Date(end_datetime).toISOString() : null,
        recurrence_rule,
        tag_id,
        price_cents,
        price_unit,
        cover_photo_url,
        duration_minutes,
        restrictions,
      },
      { count: "exact" },
    )
    .eq("id", eventId)
    .eq("place_id", placeId);
  if (error) throw new Error(error.message);
  if (!count) throw new Error("Cet événement n'appartient pas à ce lieu.");

  revalidatePath(`/dashboard/places/${placeId}/evenements`);
  revalidatePath(`/dashboard/places/${placeId}/evenements/${eventId}`);
}

export async function generateEventQrCode(placeId: string, eventId: string) {
  const { supabase, user } = await requireUser();
  await assertOwnsPlace(supabase, user.id, placeId);

  // Same reasoning as generatePlaceQrCode: /events/<id> never changes even
  // if the event's title/date/description get edited later, and ?src=qr is
  // what lets that page count this as an actual scan (see recordQrScan).
  const origin = await getSiteOrigin();
  const qr_code_url = await generateQrCodeDataUrl(`${origin}/events/${eventId}?src=qr`);

  const { error, count } = await supabase
    .from("events")
    .update({ qr_code_url }, { count: "exact" })
    .eq("id", eventId)
    .eq("place_id", placeId);
  if (error) throw new Error(error.message);
  if (!count) throw new Error("Cet événement n'appartient pas à ce lieu.");

  revalidatePath(`/dashboard/places/${placeId}/evenements/${eventId}`);
}

export async function deleteEvent(placeId: string, eventId: string) {
  const { supabase, user } = await requireUser();
  await assertOwnsPlace(supabase, user.id, placeId);

  // Same reasoning as deleteActivity: re-scope by place_id, don't rely on
  // RLS alone to catch a mismatched id.
  const { error, count } = await supabase
    .from("events")
    .delete({ count: "exact" })
    .eq("id", eventId)
    .eq("place_id", placeId);
  if (error) throw new Error(error.message);
  if (!count) throw new Error("Cet événement n'appartient pas à ce lieu.");

  // No redirect here on purpose: this same action is bound both from the
  // events list (deleting a row there — the list itself is still valid,
  // just needs a refresh) and from that event's own page (where the page
  // being edited just stopped existing) — the latter navigates itself
  // after this resolves (see the "onDeleted" callback on its DeleteButton).
  revalidatePath(`/dashboard/places/${placeId}/evenements`);
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
  const previousPath = existing?.poster_url ? storagePathFromPublicUrl(existing.poster_url) : null;
  if (previousPath) {
    await supabase.storage.from(PLACE_PHOTOS_BUCKET).remove([previousPath]);
  }

  revalidatePath(`/dashboard/places/${placeId}/evenements/${eventId}`);
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

  const path = existing?.poster_url ? storagePathFromPublicUrl(existing.poster_url) : null;
  if (path) {
    await supabase.storage.from(PLACE_PHOTOS_BUCKET).remove([path]);
  }

  revalidatePath(`/dashboard/places/${placeId}/evenements/${eventId}`);
}
