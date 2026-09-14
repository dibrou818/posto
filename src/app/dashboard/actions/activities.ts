"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { ACTIVITY_NAME_MAX_LENGTH, ACTIVITY_DESCRIPTION_MAX_LENGTH, RESTRICTIONS_MAX_LENGTH } from "@/lib/fieldLimits";
import { assertOwnsPlace, textField, textFieldLimited, parseDurationMinutes } from "./shared";

export async function createActivity(placeId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  await assertOwnsPlace(supabase, user.id, placeId);

  const name = textFieldLimited(formData, "name", ACTIVITY_NAME_MAX_LENGTH, "Nom de l'activité");
  const description = textFieldLimited(formData, "description", ACTIVITY_DESCRIPTION_MAX_LENGTH, "Description");
  const tag_id = textField(formData, "tag_id");
  const duration_minutes = parseDurationMinutes(formData, "duration_minutes");
  const restrictions = textFieldLimited(formData, "restrictions", RESTRICTIONS_MAX_LENGTH, "Restriction");

  if (!name) throw new Error("Le nom de l'activité est requis.");

  const { error } = await supabase
    .from("activities")
    .insert({ place_id: placeId, name, description, tag_id, duration_minutes, restrictions });
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/places/${placeId}/activites`);
}

export async function updateActivity(placeId: string, activityId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  await assertOwnsPlace(supabase, user.id, placeId);

  const name = textFieldLimited(formData, "name", ACTIVITY_NAME_MAX_LENGTH, "Nom de l'activité");
  const description = textFieldLimited(formData, "description", ACTIVITY_DESCRIPTION_MAX_LENGTH, "Description");
  const tag_id = textField(formData, "tag_id");
  const duration_minutes = parseDurationMinutes(formData, "duration_minutes");
  const restrictions = textFieldLimited(formData, "restrictions", RESTRICTIONS_MAX_LENGTH, "Restriction");

  if (!name) throw new Error("Le nom de l'activité est requis.");

  // Re-scope by place_id, not just id — see deleteActivity below for why.
  const { error, count } = await supabase
    .from("activities")
    .update({ name, description, tag_id, duration_minutes, restrictions }, { count: "exact" })
    .eq("id", activityId)
    .eq("place_id", placeId);
  if (error) throw new Error(error.message);
  if (!count) throw new Error("Cette activité n'appartient pas à ce lieu.");

  revalidatePath(`/dashboard/places/${placeId}/activites`);
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

  revalidatePath(`/dashboard/places/${placeId}/activites`);
}
