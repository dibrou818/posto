import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlacesByOwner } from "@/lib/queries";
import { PlaceCard } from "@/components/PlaceCard";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const places = await getPlacesByOwner(supabase, user.id);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Mes lieux</h1>
        <Link
          href="/dashboard/places/new"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          + Nouveau lieu
        </Link>
      </div>

      {places.length === 0 ? (
        <p className="text-sm text-gray-500">
          Vous n&apos;avez pas encore de lieu. Créez-en un pour commencer.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {places.map((place) => (
            <div key={place.id} className="relative">
              <PlaceCard place={place} />
              <Link
                href={`/dashboard/places/${place.id}`}
                className="absolute right-3 top-3 rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-gray-900 shadow"
              >
                Gérer
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
