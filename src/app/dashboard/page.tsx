import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getPlacesByOwner } from "@/lib/queries";
import { PlaceCard } from "@/components/PlaceCard";
import { buttonClass } from "@/lib/ui";

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();
  const places = await getPlacesByOwner(supabase, user.id);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="posto-title text-gray-900">Mes établissements</h1>
        <Link href="/dashboard/places/new" className={buttonClass("default", "w-full text-center sm:w-auto")}>
          Ajouter un établissement
        </Link>
      </div>

      {places.length === 0 ? (
        <p className="text-sm text-gray-500">
          Vous n&apos;avez pas encore de lieu. Créez-en un pour commencer.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {places.map((place) => (
            <div key={place.id} className="flex min-w-0 flex-col gap-2">
              <PlaceCard place={place} />
              <Link
                href={`/dashboard/places/${place.id}/informations`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-900 hover:bg-gray-100"
              >
                Gérer cet établissement
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
