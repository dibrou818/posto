import { getOwnedPlace } from "@/lib/dashboardPlace";
import { getActivitiesForPlace, getAllTags } from "@/lib/queries";
import { ActivitiesManager } from "@/components/dashboard/ActivitiesManager";
import { createActivity, updateActivity, deleteActivity } from "@/app/dashboard/actions";

export default async function PlaceActivitiesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getOwnedPlace(id);

  const [activities, allTags] = await Promise.all([
    getActivitiesForPlace(supabase, id),
    getAllTags(supabase),
  ]);

  return (
    <ActivitiesManager
      activities={activities}
      allTags={allTags}
      onCreate={createActivity.bind(null, id)}
      onUpdate={updateActivity.bind(null, id)}
      onDelete={deleteActivity.bind(null, id)}
    />
  );
}
