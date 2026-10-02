import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getPlaceById, getAllTags } from "@/lib/queries";
import { PlaceForm } from "@/components/dashboard/PlaceForm";
import { FormSection } from "@/components/dashboard/FormSection";
import { QrCodeSection } from "@/components/dashboard/QrCodeSection";
import { getQrScanStats } from "@/lib/qrScans";
import { updatePlace, generatePlaceQrCode } from "@/app/dashboard/actions";

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
  // No scans possible before a code exists — skip the query entirely rather
  // than asking for stats on a QR that was never generated.
  const scanStats = place.qr_code_url ? await getQrScanStats(supabase, "place", id) : undefined;

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

      <PlaceForm
        place={place}
        action={updatePlace.bind(null, id)}
        allTags={allTags}
        selectedTagIds={place.tags.map((t) => t.id)}
      />

      <FormSection
        title="Code QR du lieu"
        description="Renvoie vers la page de votre lieu. Il reste valable même si vous modifiez vos informations."
      >
        <QrCodeSection
          qrCodeUrl={place.qr_code_url}
          publicPath={`/places/${place.id}`}
          label="Renvoie vers la page de votre lieu"
          action={generatePlaceQrCode.bind(null, id)}
          scanStats={scanStats}
        />
      </FormSection>
    </div>
  );
}
