import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getPlaceById, getAllEventsForPlace, getAllTags } from "@/lib/queries";
import { EventsManager } from "@/components/dashboard/EventsManager";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { createEvent, deleteEvent } from "@/app/dashboard/actions";

export default async function PlaceEventsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const place = await getPlaceById(supabase, id);
  if (!place) notFound();
  if (place.owner_id !== user.id) redirect("/dashboard");

  const [events, allTags] = await Promise.all([
    getAllEventsForPlace(supabase, id),
    getAllTags(supabase),
  ]);

  return (
    <DashboardSection title="Événements">
      <EventsManager
        placeId={id}
        events={events}
        allTags={allTags}
        placeCoverPhotoUrl={place.cover_photo_url}
        onCreate={createEvent.bind(null, id)}
        onDelete={deleteEvent.bind(null, id)}
      />
    </DashboardSection>
  );
}
