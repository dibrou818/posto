import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import {
  getPlaceById,
  getAllTags,
  getActivitiesForPlace,
  getAllEventsForPlace,
} from "@/lib/queries";
import { PlaceForm } from "@/components/dashboard/PlaceForm";
import { OpeningHoursForm } from "@/components/dashboard/OpeningHoursForm";
import { TagsForm } from "@/components/dashboard/TagsForm";
import { ActivitiesManager } from "@/components/dashboard/ActivitiesManager";
import { EventsManager } from "@/components/dashboard/EventsManager";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DeleteButton } from "@/components/ui/DeleteButton";
import {
  updatePlace,
  deletePlace,
  saveOpeningHours,
  savePlaceTags,
  createActivity,
  deleteActivity,
  createEvent,
  deleteEvent,
} from "@/app/dashboard/actions";

export default async function EditPlacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const place = await getPlaceById(supabase, id);
  if (!place) notFound();
  if (place.owner_id !== user.id) redirect("/dashboard");

  const [allTags, activities, events] = await Promise.all([
    getAllTags(supabase),
    getActivitiesForPlace(supabase, id),
    getAllEventsForPlace(supabase, id),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">{place.name}</h1>
        <DeleteButton
          action={deletePlace.bind(null, id)}
          label="Supprimer le lieu"
          className="text-sm"
        />
      </div>

      <DashboardSection title="Informations">
        <PlaceForm place={place} action={updatePlace.bind(null, id)} />
      </DashboardSection>

      <DashboardSection title="Horaires">
        <OpeningHoursForm hours={place.opening_hours} action={saveOpeningHours.bind(null, id)} />
      </DashboardSection>

      <DashboardSection title="Tags">
        <TagsForm
          allTags={allTags}
          selectedTagIds={place.tags.map((t) => t.id)}
          action={savePlaceTags.bind(null, id)}
        />
      </DashboardSection>

      <DashboardSection title="Activités récurrentes">
        <ActivitiesManager
          activities={activities}
          allTags={allTags}
          onCreate={createActivity.bind(null, id)}
          onDelete={deleteActivity.bind(null, id)}
        />
      </DashboardSection>

      <DashboardSection title="Événements">
        <EventsManager
          events={events}
          allTags={allTags}
          onCreate={createEvent.bind(null, id)}
          onDelete={deleteEvent.bind(null, id)}
        />
      </DashboardSection>
    </div>
  );
}
