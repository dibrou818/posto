"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { PLACE_PHOTOS_BUCKET } from "@/lib/storage";
import { storagePathFromPublicUrl } from "./shared";

// Deletes the signed-in owner's account and everything they own. No
// service-role key lives anywhere in this app — instead of the admin API,
// this calls a SECURITY DEFINER Postgres function (delete_own_account) that
// deletes the caller's own auth.users row; places_owner_id_fkey is ON
// DELETE CASCADE (and every place-owned table cascades from places in
// turn), so that one delete removes every place, its opening hours, tags,
// activities and events too. Storage isn't part of that cascade — the
// owner's photos/posters are cleaned up here first, same reasoning as
// updatePlace's own cleanup, just gathered across every place instead of
// one.
export async function deleteAccount() {
  const { supabase, user } = await requireUser();

  const { data: places } = await supabase
    .from("places")
    .select("id, cover_photo_url, photo_urls")
    .eq("owner_id", user.id);

  const placeIds = (places ?? []).map((p) => p.id);
  const { data: events } =
    placeIds.length > 0
      ? await supabase.from("events").select("poster_url").in("place_id", placeIds)
      : { data: [] as { poster_url: string | null }[] };

  const urls = [
    ...(places ?? []).flatMap((p) => [p.cover_photo_url, ...p.photo_urls]),
    ...(events ?? []).map((e) => e.poster_url),
  ].filter((url): url is string => Boolean(url));
  const paths = urls.map(storagePathFromPublicUrl).filter((path): path is string => Boolean(path));
  if (paths.length > 0) {
    await supabase.storage.from(PLACE_PHOTOS_BUCKET).remove(paths);
  }

  const { error } = await supabase.rpc("delete_own_account");
  if (error) throw new Error(error.message);

  // The account (and its session) no longer exists server-side — clear the
  // now-stale session cookies explicitly rather than leaving them to expire
  // on their own.
  await supabase.auth.signOut();
  redirect("/");
}
