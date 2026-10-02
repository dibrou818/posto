import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getEventById, getAllTags } from "@/lib/queries";
import { EventForm } from "@/components/dashboard/EventForm";
import { QrCodeSection } from "@/components/dashboard/QrCodeSection";
import { PosterSection } from "@/components/dashboard/PosterSection";
import { FormSection } from "@/components/dashboard/FormSection";
import { EventDeleteButton } from "@/components/dashboard/EventDeleteButton";
import { EventTabs, type EventTabKey } from "@/components/dashboard/EventTabs";
import { LinkButton } from "@/components/ui/LinkButton";
import { getQrScanStats } from "@/lib/qrScans";
import { getEventStatus } from "@/lib/dashboardEventStatus";
import { formatEventSchedule } from "@/lib/eventSchedule";
import {
  updateEvent,
  deleteEvent,
  generateEventQrCode,
  saveEventPoster,
  deleteEventPoster,
} from "@/app/dashboard/actions";

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; eventId: string }>;
  searchParams: Promise<{ tab?: string; created?: string; duplicated?: string }>;
}) {
  const { id, eventId } = await params;
  const { tab: rawTab, created, duplicated } = await searchParams;
  const tab: EventTabKey = rawTab === "qr" || rawTab === "affiche" ? rawTab : "infos";
  const { supabase, user } = await requireUser();

  const event = await getEventById(supabase, eventId);
  // Both checks matter: the event might not exist at all, or it might exist
  // but belong to a different place/owner than the one in the URL — either
  // way, nothing here is this owner's to edit.
  if (!event || event.place_id !== id) notFound();
  if (event.place.owner_id !== user.id) redirect("/dashboard");

  const allTags = tab === "infos" ? await getAllTags(supabase) : [];
  const scanStats = tab === "qr" && event.qr_code_url ? await getQrScanStats(supabase, "event", eventId) : undefined;
  const status = getEventStatus(event);
  const basePath = `/dashboard/places/${id}/evenements/${eventId}`;

  return (
    <div>
      <LinkButton href={`/dashboard/places/${id}/evenements`} icon="back" className="mb-4">
        Retour aux événements
      </LinkButton>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight text-gray-900">{event.title}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
            {formatEventSchedule(event.start_datetime, event.end_datetime)}
          </p>
        </div>
        <LinkButton href={`/events/${event.id}`} icon="external">
          Voir la page publique
        </LinkButton>
      </div>

      {created === "1" && (
        <div role="status" className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <p className="font-semibold">Événement créé.</p>
          <p className="mt-0.5 text-green-800">
            Prochaine étape : générez son code QR, puis créez l&apos;affiche à imprimer ou à partager.
          </p>
        </div>
      )}

      {duplicated === "1" && (
        <div role="status" className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <p className="font-semibold">Copie créée.</p>
          <p className="mt-0.5 text-green-800">Ajustez maintenant la date et le titre, puis enregistrez.</p>
        </div>
      )}

      <EventTabs basePath={basePath} active={tab} hasQr={Boolean(event.qr_code_url)} hasPoster={Boolean(event.poster_url)} />

      {tab === "infos" && (
        <>
          <EventForm
            variant="page"
            event={event}
            allTags={allTags}
            placeCoverPhotoUrl={event.place.cover_photo_url}
            action={updateEvent.bind(null, id, eventId)}
          />

          <div>
            <FormSection
              title="Supprimer l'événement"
              description="Efface aussi son code QR et son affiche. Cette action est irréversible."
            >
              <div>
                <EventDeleteButton placeId={id} eventTitle={event.title} action={deleteEvent.bind(null, id, eventId)} />
              </div>
            </FormSection>
          </div>
        </>
      )}

      {tab === "qr" && (
        <>
          <FormSection
            first
            title="Code QR"
            description="Imprimez-le ou affichez-le : il renvoie vers la page de votre événement et reste valable même si vous la modifiez."
          >
            <QrCodeSection
              qrCodeUrl={event.qr_code_url}
              publicPath={`/events/${event.id}`}
              label="Renvoie vers la page de votre événement"
              action={generateEventQrCode.bind(null, id, eventId)}
              scanStats={scanStats}
            />
          </FormSection>
          <LinkButton href={`${basePath}?tab=affiche`} icon="forward" variant="solid" className="mt-2">
            Étape suivante : l&apos;affiche
          </LinkButton>
        </>
      )}

      {tab === "affiche" && (
        <>
          <FormSection
            first
            title="Affiche"
            description="Une affiche prête à imprimer, avec le code QR, à partir des informations de l'événement."
          >
            <PosterSection
              event={event}
              placeCoverPhotoUrl={event.place.cover_photo_url}
              placeName={event.place.name}
              placeAddress={event.place.address}
              placePhone={event.place.phone}
              onSave={saveEventPoster.bind(null, id, eventId)}
              onDelete={deleteEventPoster.bind(null, id, eventId)}
            />
          </FormSection>
          <LinkButton href={`/dashboard/places/${id}/evenements`} icon="back" className="mt-4">
            Retour à la liste des événements
          </LinkButton>
        </>
      )}
    </div>
  );
}
