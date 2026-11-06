import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getFollowedPlaces, getSavedEvents } from "@/lib/queries";
import { getEventStatus } from "@/lib/dashboardEventStatus";
import { PlaceCard } from "@/components/PlaceCard";
import { EventCard } from "@/components/EventCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { FavoritesTabs } from "@/components/consumer/FavoritesTabs";

export const metadata: Metadata = { title: "Mes favoris · Posto", robots: { index: false, follow: false } };

const gridClass = "grid grid-cols-1 gap-y-3.5 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-7 lg:grid-cols-4";

export default async function FavoritesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [places, events] = user ? await Promise.all([getFollowedPlaces(supabase, user.id), getSavedEvents(supabase, user.id)]) : [[], []];
  // What's still ahead leads; events that are over stay reachable below,
  // dimmed, instead of mixing in as if they were still to come.
  const now = new Date();
  const upcoming = events.filter((event) => getEventStatus(event, now).key !== "past");
  const past = events.filter((event) => getEventStatus(event, now).key === "past");

  return <div className="posto-page">
    <h1 className="posto-title mb-5">Mes favoris</h1>
    {!user ? <EmptyState title="Vos prochaines sorties commencent ici" description="Connectez-vous pour retrouver vos événements enregistrés et vos lieux suivis sur tous vos appareils." href="/login?next=%2Ffavorites" action="Se connecter" /> : <FavoritesTabs
      eventsCount={upcoming.length}
      placesCount={places.length}
      events={<div className="flex flex-col gap-10">
        {upcoming.length ? <div className={gridClass}>{upcoming.map(event => <EventCard key={event.id} event={event} />)}</div> : <EmptyState title="Une sortie vous tente ?" description="Enregistrez-la depuis sa fiche avec le bouton Enregistrer. Vous la retrouverez ici." href="/" action="Découvrir les événements" />}
        {past.length > 0 && <section>
          <h2 className="posto-section-title">Passés</h2>
          <div className={`${gridClass} opacity-60`}>{past.map(event => <EventCard key={event.id} event={event} morph={false} />)}</div>
        </section>}
      </div>}
      places={places.length ? <div className={gridClass}>{places.map(place => <PlaceCard key={place.id} place={place} />)}</div> : <EmptyState title="Gardez vos bonnes adresses" description="Appuyez sur Suivre sur la fiche d’un lieu pour le retrouver facilement." href="/map" action="Explorer la carte" />}
    />}
  </div>;
}
