import { requireUser } from "@/lib/supabase/server";
import { PlaceForm } from "@/components/dashboard/PlaceForm";
import { getAllTags } from "@/lib/queries";
import { createPlace } from "@/app/dashboard/actions";

export default async function NewPlacePage() {
  const { supabase } = await requireUser();
  const allTags = await getAllTags(supabase);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="posto-title mb-2 text-gray-900">Nouveau lieu</h1>
      <p className="mb-6 text-sm text-gray-600">
        Renseignez les infos de base — vous pourrez ajouter horaires, tags, activités et
        événements juste après.
      </p>
      <PlaceForm action={createPlace} allTags={allTags} selectedTagIds={[]} />
    </div>
  );
}
