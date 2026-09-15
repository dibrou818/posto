// Plain helpers shared across the dashboard's server actions (places,
// activities, events, account) — deliberately NOT marked "use server": a
// file with that directive can only export async functions, and several of
// these (textField, storagePathFromPublicUrl...) are synchronous. Each
// domain's own actions/*.ts file imports what it needs from here instead of
// every domain re-deriving the same parsing/validation logic.
//
// Split out of what used to be one 667-line actions.ts mixing all four
// domains — same functions, same behavior, just organized by what they're
// actually for.

import { createClient } from "@/lib/supabase/server";
import { PLACE_PHOTOS_BUCKET } from "@/lib/storage";

// getSiteOrigin now lives in @/lib/site (also needed outside the dashboard —
// the public event page's .ics download and Open Graph metadata) —
// re-exported here so every existing "./shared" import keeps working.
export { getSiteOrigin } from "@/lib/site";

export async function assertOwnsPlace(
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

export function textField(formData: FormData, key: string): string | null {
  return String(formData.get(key) ?? "").trim() || null;
}

// The dashboard forms already cap each field's length client-side (see
// each form's own MAX_LENGTH constants, sourced from lib/fieldLimits so the
// two can't drift apart) — that's a UX nicety (stops typing at the limit),
// not a guarantee: nothing stops a request built directly against these
// actions, bypassing the form entirely. This is the actual enforcement.
export function textFieldLimited(formData: FormData, key: string, maxLength: number, label: string): string | null {
  const value = textField(formData, key);
  if (value && value.length > maxLength) {
    throw new Error(`${label} : ${maxLength} caractères maximum.`);
  }
  return value;
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

export function parseCoverPhotoUrl(formData: FormData): string | null {
  const value = textField(formData, "cover_photo_url");
  return value ? validatePhotoUrl(value) : null;
}

// The gallery form field (see PlaceForm) submits one "photo_urls" entry per
// uploaded photo — same upload flow/bucket as the cover photo, so the same
// host allowlist applies to each one individually.
export function parsePhotoUrls(formData: FormData): string[] {
  return formData.getAll("photo_urls").map(String).filter(Boolean).map(validatePhotoUrl);
}

// Shared by activities and events — both got a "durée typique" field with
// the same shape and the same validation needs.
export function parseDurationMinutes(formData: FormData, key: string): number | null {
  const raw = textField(formData, key);
  if (!raw) return null;
  const minutes = Number(raw);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw new Error("Durée invalide.");
  }
  return Math.round(minutes);
}

export function parseUrlField(formData: FormData, key: string, label: string): string | null {
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

// A generated poster/photo is always our own upload — this is scoped to
// exactly one bucket, not a general allowlist like ALLOWED_PHOTO_HOSTS
// above (which also has to admit third-party seed photos).
export const SUPABASE_STORAGE_HOST = "khvchawnkzamhfwrbhtz.supabase.co";
export const STORAGE_PUBLIC_PATH_PREFIX = `/storage/v1/object/public/${PLACE_PHOTOS_BUCKET}/`;

// Not poster-specific despite the name it replaced (storagePathFromPosterUrl)
// — any public URL in our own bucket (a poster, a cover photo, a gallery
// photo) has this exact same shape, so this backs Storage cleanup for all of
// them. Returns null for a URL that isn't actually ours (e.g. one of the
// Unsplash/Picsum photos seeded on demo places) — nothing to remove there,
// not an error.
export function storagePathFromPublicUrl(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    if (url.hostname !== SUPABASE_STORAGE_HOST || !url.pathname.startsWith(STORAGE_PUBLIC_PATH_PREFIX)) return null;
    return decodeURIComponent(url.pathname.slice(STORAGE_PUBLIC_PATH_PREFIX.length));
  } catch {
    return null;
  }
}
