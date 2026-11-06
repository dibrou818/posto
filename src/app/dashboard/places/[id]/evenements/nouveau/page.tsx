import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getPlaceById, getAllTags } from "@/lib/queries";
import { EventForm } from "@/components/dashboard/EventForm";
import { createEvent } from "@/app/dashboard/actions";

/** Creating an event gets a page of its own, laid out exactly like editing
 * one — instead of a form folded inside the events list. On save, the
 * action opens the new event's page on its QR code step. */
export default async function NewEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const place = await getPlaceById(supabase, id);
  if (!place) notFound();
  if (place.owner_id !== user.id) redirect("/dashboard");

  const allTags = await getAllTags(supabase);

  return (
    <div>
      <Link href={`/dashboard/places/${id}/evenements`} className="text-sm text-gray-500 hover:text-gray-900">
        Événements
      </Link>
      <h2 className="posto-heading mt-1 mb-6 text-2xl text-gray-900">Nouvel événement</h2>
      <EventForm variant="page" allTags={allTags} placeCoverPhotoUrl={place.cover_photo_url} action={createEvent.bind(null, id)} />
    </div>
  );
}
