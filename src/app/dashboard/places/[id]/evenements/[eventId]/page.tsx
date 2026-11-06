import Link from "next/link";
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
  duplicateEvent,
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
      <Link href={`/dashboard/places/${id}/evenements`} className="text-sm text-gray-500 hover:text-gray-900">
        Événements
      </Link>
      <div className="mt-1 mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h2 className="posto-heading text-2xl text-gray-900">{event.title}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 tabular-nums">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
            {formatEventSchedule(event.start_datetime, event.end_datetime)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <form action={duplicateEvent.bind(null, id, eventId)}>
            <button
              type="submit"
              className="inline-flex min-h-10 items-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
            >
              Dupliquer
            </button>
          </form>
          <LinkButton href={`/events/${event.id}`} icon="external">
            Voir
          </LinkButton>
        </div>
      </div>

      {(created === "1" || duplicated === "1") && (
        <p role="status" className="mb-5 flex items-start gap-2 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" aria-hidden="true" />
          {created === "1" ? (
            <span>
              <span className="font-medium text-gray-900">Événement créé.</span> Générez son code QR, puis son affiche.
            </span>
          ) : (
            <span>
              <span className="font-medium text-gray-900">Copie créée.</span> Ajustez la date et le titre, puis enregistrez.
            </span>
          )}
        </p>
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
        </>
      )}
    </div>
  );
}
