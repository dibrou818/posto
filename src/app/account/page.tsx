import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getFollowedPlaces, getPlacesByOwner, getSavedEvents } from "@/lib/queries";
import { SignOutButton } from "@/components/SignOutButton";
import { EventCard } from "@/components/EventCard";

export const metadata: Metadata = { title: "Mon compte · Posto", robots: { index: false, follow: false } };

function AccountLink({ href, title, detail }: { href: string; title: string; detail: string }) {
  return <Link href={href} className="flex min-h-16 items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-gray-50">
    <span className="min-w-0"><span className="block font-medium text-gray-900">{title}</span><span className="mt-0.5 block text-sm leading-relaxed text-gray-600">{detail}</span></span>
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true"><path d="m8 5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
  </Link>;
}

function Stat({ value, label, href }: { value: number; label: string; href: string }) {
  return <Link href={href} className="flex flex-1 flex-col items-center rounded-2xl border border-gray-200 px-3 py-3 text-center transition-colors hover:bg-gray-50">
    <span className="posto-heading text-2xl text-gray-900 tabular-nums">{value}</span>
    <span className="text-sm text-gray-600">{label}</span>
  </Link>;
}

/** A readable first name out of what we have: a name stored on the account
 * if there is one, otherwise the part of the email before the "@". */
function displayName(user: { email?: string; user_metadata?: Record<string, unknown> }) {
  const meta = user.user_metadata ?? {};
  const named = [meta.full_name, meta.name, meta.first_name].find((value) => typeof value === "string" && value.trim());
  const raw = (typeof named === "string" ? named : (user.email ?? "").split("@")[0]).trim();
  const first = raw.split(/[\s._-]+/)[0] ?? raw;
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : "Vous";
}

export default async function AccountPage() {
  const { supabase, user } = await requireUser();
  const [places, savedEvents, followedPlaces] = await Promise.all([
    getPlacesByOwner(supabase, user.id),
    getSavedEvents(supabase, user.id),
    getFollowedPlaces(supabase, user.id),
  ]);
  const name = displayName(user);
  // The next few saved events that haven't happened yet — the reason to open
  // this page: what's coming up that you've said you want to go to.
  const upcomingSaved = savedEvents.filter((event) => new Date(event.start_datetime) >= new Date()).slice(0, 4);

  return <div className="posto-page !max-w-3xl">
    <header className="flex items-center gap-4">
      <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gray-900 posto-heading text-2xl text-white">{name.charAt(0)}</span>
      <div className="min-w-0">
        <h1 className="posto-title">{name}</h1>
        <p className="mt-0.5 truncate text-sm text-gray-600">{user.email}</p>
      </div>
    </header>

    <div className="mt-6 flex gap-3">
      <Stat value={savedEvents.length} label={savedEvents.length > 1 ? "événements enregistrés" : "événement enregistré"} href="/favorites" />
      <Stat value={followedPlaces.length} label={followedPlaces.length > 1 ? "lieux suivis" : "lieu suivi"} href="/favorites" />
    </div>

    {upcomingSaved.length > 0 && (
      <section aria-labelledby="upcoming-saved" className="mt-8">
        <h2 id="upcoming-saved" className="mb-3 text-lg font-semibold tracking-tight text-gray-900">Bientôt</h2>
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {upcomingSaved.map((event) => (
            <div key={event.id} className="w-[44%] max-w-56 shrink-0 snap-start sm:w-56">
              <EventCard event={event} morph={false} variant="tile" />
            </div>
          ))}
        </div>
      </section>
    )}

    <section aria-label="Mon espace personnel" className="mt-8 divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <AccountLink href="/favorites" title="Mes favoris" detail="Retrouver mes événements enregistrés et mes lieux suivis" />
      <AccountLink href="/account/settings" title="Paramètres du compte" detail="Adresse email, mot de passe et sécurité" />
    </section>
    <section aria-labelledby="pro-space" className="mt-8">
      <h2 id="pro-space" className="mb-3 text-sm font-medium text-gray-500">Pour les professionnels</h2>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <AccountLink href={places.length ? "/dashboard" : "/dashboard/places/new"} title={places.length ? "Espace professionnel" : "Ajouter mon lieu"} detail={places.length ? `Gérer ${places.length === 1 ? places[0].name : `mes ${places.length} lieux`}` : "Présenter mon lieu et publier ses événements"} />
      </div>
    </section>
    <div className="mt-8"><SignOutButton /></div>
  </div>;
}
