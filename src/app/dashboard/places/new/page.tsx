import { requireUser } from "@/lib/supabase/server";
import { PlaceForm } from "@/components/dashboard/PlaceForm";
import { BackButton } from "@/components/ui/BackButton";
import { createPlace } from "@/app/dashboard/actions";

export default async function NewPlacePage() {
  await requireUser();

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <div className="mb-4">
        <BackButton fallbackHref="/dashboard" />
      </div>
      <h1 className="mb-1 text-xl font-bold text-gray-900">Nouveau lieu</h1>
      <p className="mb-6 text-sm text-gray-500">
        Renseignez les infos de base — vous pourrez ajouter horaires, tags, activités et
        événements juste après.
      </p>
      <PlaceForm action={createPlace} />
    </div>
  );
}
