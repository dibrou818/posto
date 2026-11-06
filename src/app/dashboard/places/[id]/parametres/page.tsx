import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getPlaceById } from "@/lib/queries";
import { getQrScanStats } from "@/lib/qrScans";
import { FormSection } from "@/components/dashboard/FormSection";
import { QrCodeSection } from "@/components/dashboard/QrCodeSection";
import { DeletePlaceSection } from "@/components/dashboard/DeletePlaceSection";
import { deletePlace, generatePlaceQrCode } from "@/app/dashboard/actions";

/** The place's settings: what you set up once (its QR code) and the one
 * irreversible action, kept away from the everyday information form. */
export default async function PlaceSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const place = await getPlaceById(supabase, id);
  if (!place) notFound();
  if (place.owner_id !== user.id) redirect("/dashboard");

  // No scans possible before a code exists — skip the query entirely.
  const scanStats = place.qr_code_url ? await getQrScanStats(supabase, "place", id) : undefined;

  return (
    <div>
      <FormSection
        first
        title="Code QR du lieu"
        description="À imprimer ou à afficher : il renvoie vers votre fiche et reste valable même si vous la modifiez."
      >
        <QrCodeSection
          qrCodeUrl={place.qr_code_url}
          publicPath={`/places/${place.id}`}
          label="Renvoie vers la page de votre lieu"
          action={generatePlaceQrCode.bind(null, id)}
          scanStats={scanStats}
        />
      </FormSection>

      <FormSection title="Supprimer le lieu" description="Efface aussi ses horaires, activités, événements, codes QR et affiches.">
        <DeletePlaceSection placeName={place.name} action={deletePlace.bind(null, id)} />
      </FormSection>
    </div>
  );
}
