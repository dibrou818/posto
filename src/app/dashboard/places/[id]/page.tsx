import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

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
        <form action={deletePlace.bind(null, id)}>
          <button type="submit" className="text-sm text-red-600 hover:underline">
            Supprimer le lieu
          </button>
        </form>
      </div>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Informations
        </h2>
        <PlaceForm place={place} action={updatePlace.bind(null, id)} />
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Horaires
        </h2>
        <OpeningHoursForm hours={place.opening_hours} action={saveOpeningHours.bind(null, id)} />
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Tags</h2>
        <TagsForm
          allTags={allTags}
          selectedTagIds={place.tags.map((t) => t.id)}
          action={savePlaceTags.bind(null, id)}
        />
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Activités récurrentes
        </h2>
        <ActivitiesManager
          activities={activities}
          allTags={allTags}
          onCreate={createActivity.bind(null, id)}
          onDelete={deleteActivity.bind(null, id)}
        />
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Événements
        </h2>
        <EventsManager
          events={events}
          allTags={allTags}
          onCreate={createEvent.bind(null, id)}
          onDelete={deleteEvent.bind(null, id)}
        />
      </section>
    </div>
  );
}
