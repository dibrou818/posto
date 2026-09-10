import Link from "next/link";
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
import { QrCodeSection } from "@/components/dashboard/QrCodeSection";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { BackButton } from "@/components/ui/BackButton";
import { buttonClass } from "@/lib/ui";
import {
  updatePlace,
  deletePlace,
  saveOpeningHours,
  savePlaceTags,
  createActivity,
  deleteActivity,
  createEvent,
  deleteEvent,
  generatePlaceQrCode,
  generateEventQrCode,
} from "@/app/dashboard/actions";

export default async function EditPlacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
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
      <div className="mb-4 flex items-center gap-3">
        <BackButton fallbackHref="/dashboard" />
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 transition-colors hover:text-gray-900 focus:outline-none focus-visible:underline"
        >
          Mes lieux
        </Link>
      </div>

      {created === "1" && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <p className="font-medium">✅ Lieu créé avec succès.</p>
          <p className="mt-0.5 text-green-700">
            Complétez ci-dessous les horaires, tags, activités et événements si besoin — chaque
            section s&apos;enregistre indépendamment. Revenez à votre liste quand vous avez terminé.
          </p>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">{place.name}</h1>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className={buttonClass("compact")}>
            Terminé
          </Link>
          <DeleteButton
            action={deletePlace.bind(null, id)}
            label="Supprimer le lieu"
            className="text-sm"
          />
        </div>
      </div>

      <DashboardSection title="Informations">
        <PlaceForm place={place} action={updatePlace.bind(null, id)} />
      </DashboardSection>

      <DashboardSection title="Code QR">
        <QrCodeSection
          qrCodeUrl={place.qr_code_url}
          publicPath={`/places/${place.id}`}
          action={generatePlaceQrCode.bind(null, id)}
        />
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
          onGenerateQr={generateEventQrCode.bind(null, id)}
        />
      </DashboardSection>
    </div>
  );
}
