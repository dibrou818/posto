// The single Supabase Storage bucket every place/event photo (cover photos,
// gallery photos, generated posters) is uploaded to and read from. Kept as
// one shared constant so a future rename can't silently miss one of the
// several call sites that reference it by string.
export const PLACE_PHOTOS_BUCKET = "place-photos";
