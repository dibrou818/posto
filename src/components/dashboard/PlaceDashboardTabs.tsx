"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: { slug: string; label: string }[] = [
  { slug: "informations", label: "Informations" },
  { slug: "horaires", label: "Horaires" },
  { slug: "activites", label: "Activités" },
  { slug: "evenements", label: "Événements" },
  { slug: "parametres", label: "Paramètres" },
];

/** Segmented-control nav between a place's dashboard sub-pages — same
 * visual language as the map's Lieux/Événements toggle, so switching
 * "sections of a thing I'm managing" always looks the same across the app.
 * A real route per tab (not client-side tab state) so each one only loads
 * its own data, and the URL/back button both work the way people expect. */
export function PlaceDashboardTabs({ placeId }: { placeId: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto rounded-lg border border-gray-200 bg-white p-1">
      {TABS.map((tab) => {
        const href = `/dashboard/places/${placeId}/${tab.slug}`;
        // startsWith, not exact match: the Événements tab should still read
        // as active while looking at one specific event's own edit page.
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={tab.slug}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 ${
              active ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
