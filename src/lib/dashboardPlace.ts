import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getPlaceById, getPlacesByOwner } from "@/lib/queries";

/** The place a /dashboard/places/[id] screen is about, checked to belong to
 * the signed-in owner. Memoized per request, so the place layout and the
 * page under it share one fetch instead of loading the same place twice. */
export const getOwnedPlace = cache(async (id: string) => {
  const { supabase, user } = await requireUser();
  const place = await getPlaceById(supabase, id);
  if (!place) notFound();
  if (place.owner_id !== user.id) redirect("/dashboard");
  return { supabase, user, place };
});

/** Every place of the signed-in owner. Memoized per request: the dashboard
 * shell (sidebar) and the "Mes lieux" page both need the list. */
export const getOwnedPlaces = cache(async () => {
  const { supabase, user } = await requireUser();
  const places = await getPlacesByOwner(supabase, user.id);
  return { supabase, user, places };
});
