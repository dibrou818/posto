import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getPlaceById, getAllTags } from "@/lib/queries";
import { PlaceForm } from "@/components/dashboard/PlaceForm";
import { TagsForm } from "@/components/dashboard/TagsForm";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { QrCodeSection } from "@/components/dashboard/QrCodeSection";
import { updatePlace, savePlaceTags, generatePlaceQrCode } from "@/app/dashboard/actions";

export default async function PlaceInformationsPage({
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

  const allTags = await getAllTags(supabase);

  return (
    <div>
      {created === "1" && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <p className="font-medium">✅ Lieu créé avec succès.</p>
          <p className="mt-0.5 text-green-700">
            Complétez ci-dessous ses informations, puis les autres onglets (horaires, activités,
            événements) si besoin — chaque section s&apos;enregistre indépendamment.
          </p>
        </div>
      )}

      <DashboardSection title="Informations générales">
        <PlaceForm place={place} action={updatePlace.bind(null, id)} />
      </DashboardSection>

      <DashboardSection title="Tags">
        <TagsForm
          allTags={allTags}
          selectedTagIds={place.tags.map((t) => t.id)}
          action={savePlaceTags.bind(null, id)}
        />
      </DashboardSection>

      <DashboardSection title="Code QR du lieu">
        <QrCodeSection
          qrCodeUrl={place.qr_code_url}
          publicPath={`/places/${place.id}`}
          action={generatePlaceQrCode.bind(null, id)}
        />
      </DashboardSection>
    </div>
  );
}
