import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getEventById, getAllTags } from "@/lib/queries";
import { EventForm } from "@/components/dashboard/EventForm";
import { QrCodeSection } from "@/components/dashboard/QrCodeSection";
import { PosterSection } from "@/components/dashboard/PosterSection";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { EventDeleteButton } from "@/components/dashboard/EventDeleteButton";
import {
  updateEvent,
  deleteEvent,
  generateEventQrCode,
  saveEventPoster,
  deleteEventPoster,
} from "@/app/dashboard/actions";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string; eventId: string }>;
}) {
  const { id, eventId } = await params;
  const { supabase, user } = await requireUser();

  const event = await getEventById(supabase, eventId);
  // Both checks matter: the event might not exist at all, or it might exist
  // but belong to a different place/owner than the one in the URL — either
  // way, nothing here is this owner's to edit.
  if (!event || event.place_id !== id) notFound();
  if (event.place.owner_id !== user.id) redirect("/dashboard");

  const allTags = await getAllTags(supabase);

  return (
    <div>
      <Link
        href={`/dashboard/places/${id}/evenements`}
        className="mb-4 inline-block text-sm text-gray-500 transition-colors hover:text-gray-900 focus:outline-none focus-visible:underline"
      >
        ← Retour aux événements
      </Link>

      <DashboardSection title="Informations de l'événement">
        <EventForm
          event={event}
          allTags={allTags}
          placeCoverPhotoUrl={event.place.cover_photo_url}
          action={updateEvent.bind(null, id, eventId)}
        />
      </DashboardSection>

      <DashboardSection title="Code QR">
        <QrCodeSection
          qrCodeUrl={event.qr_code_url}
          publicPath={`/events/${event.id}`}
          action={generateEventQrCode.bind(null, id, eventId)}
        />
      </DashboardSection>

      <DashboardSection title="Affiche">
        <PosterSection
          event={event}
          placeCoverPhotoUrl={event.place.cover_photo_url}
          placeName={event.place.name}
          placeAddress={event.place.address}
          placePhone={event.place.phone}
          onSave={saveEventPoster.bind(null, id, eventId)}
          onDelete={deleteEventPoster.bind(null, id, eventId)}
        />
      </DashboardSection>

      <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4">
        <h2 className="text-sm font-semibold text-red-800">Zone de danger</h2>
        <p className="mt-1 mb-3 text-sm text-red-700">
          Supprimer « {event.title} » efface aussi son code QR et son affiche. Cette action est
          irréversible.
        </p>
        <EventDeleteButton placeId={id} eventTitle={event.title} action={deleteEvent.bind(null, id, eventId)} />
      </div>
    </div>
  );
}
