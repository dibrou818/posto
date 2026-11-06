import { getOwnedPlace } from "@/lib/dashboardPlace";
import { getAllTags } from "@/lib/queries";
import { PlaceForm } from "@/components/dashboard/PlaceForm";
import { updatePlace } from "@/app/dashboard/actions";

export default async function PlaceInformationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  const { supabase, place } = await getOwnedPlace(id);

  const allTags = await getAllTags(supabase);

  return (
    <div>
      {created === "1" && (
        <p role="status" className="mb-6 flex items-start gap-2 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" aria-hidden="true" />
          <span>
            <span className="font-medium text-gray-900">Lieu créé.</span> Complétez ses informations, puis ses horaires
            dans l&apos;onglet suivant.
          </span>
        </p>
      )}

      <PlaceForm
        place={place}
        action={updatePlace.bind(null, id)}
        allTags={allTags}
        selectedTagIds={place.tags.map((t) => t.id)}
      />
    </div>
  );
}
