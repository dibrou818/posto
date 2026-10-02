import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getFollowedPlaces, getSavedEvents } from "@/lib/queries";
import { PlaceCard } from "@/components/PlaceCard";
import { EventCard } from "@/components/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { FavoritesTabs } from "@/components/consumer/FavoritesTabs";

export const metadata: Metadata = { title: "Mes favoris · Posto", robots: { index: false, follow: false } };

export default async function FavoritesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [places, events] = user ? await Promise.all([getFollowedPlaces(supabase, user.id), getSavedEvents(supabase, user.id)]) : [[], []];
  return <div className="posto-page">
    <h1 className="posto-title mb-5">Mes favoris</h1>
    {!user ? <EmptyState title="Vos prochaines sorties commencent ici" description="Connectez-vous pour retrouver vos événements enregistrés et vos lieux suivis sur tous vos appareils." href="/login?next=%2Ffavorites" action="Se connecter" /> : <FavoritesTabs
      eventsCount={events.length}
      placesCount={places.length}
      events={events.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{events.map(event => <EventCard key={event.id} event={event} />)}</div> : <EmptyState title="Une sortie vous tente ?" description="Enregistrez-la depuis sa fiche avec le bouton Enregistrer. Vous la retrouverez ici." href="/" action="Découvrir les événements" />}
      places={places.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{places.map(place => <PlaceCard key={place.id} place={place} />)}</div> : <EmptyState title="Gardez vos bonnes adresses" description="Appuyez sur Suivre sur la fiche d’un lieu pour le retrouver facilement." href="/map" action="Explorer la carte" />}
    />}
  </div>;
}
