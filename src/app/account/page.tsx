import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getFollowedPlaces, getPlacesByOwner, getSavedEvents } from "@/lib/queries";
import { PlaceCard } from "@/components/PlaceCard";
import { EventCard } from "@/components/EventCard";
import { SignOutButton } from "@/components/SignOutButton";
import { buttonClass } from "@/lib/ui";

export default async function AccountPage() {
  const { supabase, user } = await requireUser();
  const [followedPlaces, savedEvents, managedPlaces] = await Promise.all([
    getFollowedPlaces(supabase, user.id),
    getSavedEvents(supabase, user.id),
    getPlacesByOwner(supabase, user.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-gray-500">Mon compte</p>
          <h1 className="mt-1 break-all text-xl font-bold text-gray-900">{user.email}</h1>
        </div>
        <Link href="/dashboard/parametres" className="text-sm font-medium text-gray-700 underline underline-offset-4">
          Paramètres
        </Link>
      </div>

      {managedPlaces.length > 0 ? (
        <section className="mt-6 flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-900">
            PRO
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-gray-900">Espace professionnel</h2>
            <p className="truncate text-xs text-gray-500">
              {managedPlaces.length === 1 ? managedPlaces[0].name : `${managedPlaces.length} établissements`}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="shrink-0 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/30 focus-visible:ring-offset-2"
          >
            Accéder →
          </Link>
        </section>
      ) : (
        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-semibold tracking-[0.16em] text-gray-500 uppercase">Vous êtes professionnel ?</p>
          <h2 className="mt-2 text-lg font-semibold text-gray-900">Présentez votre établissement sur Posto</h2>
          <p className="mt-1 text-sm text-gray-600">Ajoutez votre lieu et publiez ses activités et événements.</p>
          <Link href="/dashboard/places/new" className={buttonClass("default", "mt-4 inline-flex")}>
            Ajouter un établissement
          </Link>
        </section>
      )}

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Événements enregistrés</h2>
          <span className="text-sm text-gray-500">{savedEvents.length}</span>
        </div>
        {savedEvents.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {savedEvents.map((event) => <EventCard key={event.id} event={event} />)}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-600">
            Enregistrez un événement avec l’icône marque-page pour le retrouver ici.
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Lieux suivis</h2>
          <span className="text-sm text-gray-500">{followedPlaces.length}</span>
        </div>
        {followedPlaces.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {followedPlaces.map((place) => <PlaceCard key={place.id} place={place} />)}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-600">
            Suivez vos lieux préférés pour retrouver leurs nouveautés plus tard.
          </div>
        )}
      </section>

      <div className="mt-10 border-t border-gray-200 pt-6">
        <SignOutButton />
      </div>
    </div>
  );
}
