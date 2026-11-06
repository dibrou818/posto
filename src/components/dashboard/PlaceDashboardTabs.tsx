"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: { slug: string; label: string }[] = [
  { slug: "informations", label: "Informations" },
  { slug: "horaires", label: "Horaires" },
  { slug: "activites", label: "Activités" },
  { slug: "evenements", label: "Événements" },
  { slug: "parametres", label: "Réglages" },
];

/** The sections of a place, as one row of underlined tabs under its name —
 * the same on a phone (scrolls sideways) and on a desktop. A real route per
 * tab so each loads only its own data and the back button works. */
export function PlaceDashboardTabs({ placeId }: { placeId: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections du lieu" className="-mx-4 flex overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      {TABS.map((tab) => {
        const href = `/dashboard/places/${placeId}/${tab.slug}`;
        // startsWith, not exact match: the Événements tab stays active on
        // one event's own edit page.
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={tab.slug}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px inline-flex min-h-12 shrink-0 items-center border-b-2 px-3 text-sm font-medium transition-colors first:pl-0 focus:outline-none focus-visible:text-gray-900 ${
              active ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
