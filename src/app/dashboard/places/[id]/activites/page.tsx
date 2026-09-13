import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getPlaceById, getActivitiesForPlace, getAllTags } from "@/lib/queries";
import { ActivitiesManager } from "@/components/dashboard/ActivitiesManager";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { createActivity, updateActivity, deleteActivity } from "@/app/dashboard/actions";

export default async function PlaceActivitiesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const place = await getPlaceById(supabase, id);
  if (!place) notFound();
  if (place.owner_id !== user.id) redirect("/dashboard");

  const [activities, allTags] = await Promise.all([
    getActivitiesForPlace(supabase, id),
    getAllTags(supabase),
  ]);

  return (
    <DashboardSection title="Activités récurrentes">
      <ActivitiesManager
        activities={activities}
        allTags={allTags}
        onCreate={createActivity.bind(null, id)}
        onUpdate={updateActivity.bind(null, id)}
        onDelete={deleteActivity.bind(null, id)}
      />
    </DashboardSection>
  );
}
