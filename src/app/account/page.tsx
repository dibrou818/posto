import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getPlacesByOwner } from "@/lib/queries";
import { SignOutButton } from "@/components/SignOutButton";

export const metadata: Metadata = { title: "Mon compte · Posto", robots: { index: false, follow: false } };

function AccountLink({ href, title, detail }: { href: string; title: string; detail: string }) {
  return <Link href={href} className="flex min-h-20 items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-gray-50">
    <span className="min-w-0"><span className="block font-semibold text-gray-900">{title}</span><span className="mt-1 block text-sm leading-relaxed text-gray-600">{detail}</span></span>
    <span aria-hidden="true" className="text-xl text-gray-400">→</span>
  </Link>;
}

export default async function AccountPage() {
  const { supabase, user } = await requireUser();
  const places = await getPlacesByOwner(supabase, user.id);
  return <div className="posto-page !max-w-3xl">
    <h1 className="posto-title">Mon compte</h1>
    <p className="mt-3 break-words text-gray-600">{user.email}</p>
    <section aria-label="Mon espace personnel" className="mt-8 divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <AccountLink href="/favorites" title="Mes favoris" detail="Retrouver mes événements enregistrés et mes lieux suivis" />
      <AccountLink href="/account/settings" title="Paramètres du compte" detail="Adresse email, mot de passe et sécurité" />
    </section>
    <section aria-labelledby="pro-space" className="mt-8">
      <h2 id="pro-space" className="mb-3 text-sm font-medium text-gray-500">Pour les professionnels</h2>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <AccountLink href={places.length ? "/dashboard" : "/dashboard/places/new"} title={places.length ? "Espace professionnel" : "Ajouter mon établissement"} detail={places.length ? `Gérer ${places.length === 1 ? places[0].name : `mes ${places.length} établissements`}` : "Présenter mon lieu et publier ses événements"} />
      </div>
    </section>
    <div className="mt-8"><SignOutButton /></div>
  </div>;
}
