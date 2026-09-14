import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { getPlacesByOwner } from "@/lib/queries";
import { PlaceCard } from "@/components/PlaceCard";
import { buttonClass } from "@/lib/ui";

// A gear/cog, not the sun-with-rays a plain "circle + radiating lines"
// reads as (easy to confuse with a light/dark theme toggle) — six solid
// teeth around a ring with a center hole is unambiguous even at this size.
function GearIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]">
      <g fill="currentColor">
        <rect x="9" y="1.6" width="2" height="2.6" rx="0.4" />
        <rect x="9" y="1.6" width="2" height="2.6" rx="0.4" transform="rotate(60 10 10)" />
        <rect x="9" y="1.6" width="2" height="2.6" rx="0.4" transform="rotate(120 10 10)" />
        <rect x="9" y="1.6" width="2" height="2.6" rx="0.4" transform="rotate(180 10 10)" />
        <rect x="9" y="1.6" width="2" height="2.6" rx="0.4" transform="rotate(240 10 10)" />
        <rect x="9" y="1.6" width="2" height="2.6" rx="0.4" transform="rotate(300 10 10)" />
      </g>
      <circle cx="10" cy="10" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="10" cy="10" r="1.8" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();
  const places = await getPlacesByOwner(supabase, user.id);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Mes lieux</h1>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/places/new" className={buttonClass()}>
            + Nouveau lieu
          </Link>
          {/* h-9 w-9 (36px) — matches buttonClass()'s own rendered height
              (py-2 + text-sm line-height, no border) exactly, so this reads
              as the same button family as "+ Nouveau lieu" sitting right
              next to it, not a slightly-taller square bolted on. Measured,
              not guessed — see the app-wide convention this codifies. */}
          <Link
            href="/dashboard/parametres"
            aria-label="Paramètres du compte"
            title="Paramètres du compte"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
          >
            <GearIcon />
          </Link>
        </div>
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
                href={`/dashboard/places/${place.id}/informations`}
                className="absolute top-3 right-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-900 shadow-sm backdrop-blur transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/30"
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
