import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getFollowedPlaces, getSavedEvents } from "@/lib/queries";
import { PlaceCard } from "@/components/PlaceCard";
import { EventCard } from "@/components/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "Mes favoris · Posto", robots: { index: false, follow: false } };

export default async function FavoritesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [places, events] = user ? await Promise.all([getFollowedPlaces(supabase, user.id), getSavedEvents(supabase, user.id)]) : [[], []];
  return <div className="posto-page">
    <h1 className="posto-title">Mes favoris</h1>
    <p className="mt-3 mb-8 text-gray-600">Les sorties à garder en tête, les lieux à retrouver.</p>
    {!user ? <EmptyState title="Vos prochaines sorties commencent ici" description="Connectez-vous pour retrouver vos événements enregistrés et vos lieux suivis sur tous vos appareils." href="/login?next=%2Ffavorites" action="Se connecter" /> : <>
      <section aria-labelledby="saved-events">
        <h2 id="saved-events" className="mb-4 text-xl font-semibold">Événements enregistrés <span className="text-sm font-normal text-gray-500">({events.length})</span></h2>
        {events.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{events.map(event => <EventCard key={event.id} event={event} />)}</div> : <EmptyState title="Une sortie vous tente ?" description="Enregistrez-la depuis sa fiche avec le marque-page. Vous la retrouverez ici." href="/" action="Découvrir les événements" />}
      </section>
      <section aria-labelledby="followed-places" className="mt-10">
        <h2 id="followed-places" className="mb-4 text-xl font-semibold">Lieux suivis <span className="text-sm font-normal text-gray-500">({places.length})</span></h2>
        {places.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{places.map(place => <PlaceCard key={place.id} place={place} />)}</div> : <EmptyState title="Gardez vos bonnes adresses" description="Appuyez sur Suivre sur la fiche d’un lieu pour le retrouver facilement." href="/map" action="Explorer la carte" />}
      </section>
    </>}
  </div>;
}
