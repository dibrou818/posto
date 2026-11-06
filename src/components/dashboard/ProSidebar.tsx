"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { OpenStatusTone } from "@/lib/opening-hours";
import { Logo } from "@/components/Logo";
import { PlusIcon } from "@/components/ui/PlusIcon";
import { STATUS_DOT } from "@/components/OpenStatusLabel";

type ManagedPlace = {
  id: string;
  name: string;
  coverPhotoUrl: string | null;
  tone: OpenStatusTone;
};

function UserIcon() {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4 shrink-0" aria-hidden="true"><circle cx="10" cy="7" r="3.2"/><path d="M3.8 17c.8-3 3.3-4.5 6.2-4.5s5.4 1.5 6.2 4.5" strokeLinecap="round"/></svg>;
}

function ArrowLeftIcon() {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4 shrink-0" aria-hidden="true"><path d="m11.5 5-5 5 5 5M6.8 10H17" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function ChevronLeftIcon() {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0" aria-hidden="true"><path d="M12 4 6 10l6 6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

const rowClass = (active: boolean) =>
  `flex min-h-10 items-center gap-3 rounded-lg px-2.5 py-1.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 ${
    active ? "bg-gray-100 font-medium text-gray-900" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
  }`;

/** The pro shell. One rule: the left column says *which place*, the tabs at
 * the top of the page say *which section* of it. On desktop every place is
 * listed right here (no dropdown to open), and switching place keeps the
 * section you were on. On a phone there is no drawer and no bottom bar —
 * the "Mes lieux" page is the place picker, and a single back link leads
 * to it from anywhere. */
export function ProSidebar({ places }: { places: ManagedPlace[] }) {
  const pathname = usePathname();
  const match = pathname.match(/^\/dashboard\/places\/([^/]+)(?:\/([^/]+))?/);
  const placeId = match && match[1] !== "new" ? match[1] : null;
  const section = match?.[2] ?? "informations";
  const onHome = pathname === "/dashboard";

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col border-r border-gray-200 bg-white lg:flex">
        <div className="flex h-16 shrink-0 items-center px-5">
          <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20">
            <Logo size={28} />
            <span className="text-sm font-medium text-gray-500">Pro</span>
          </Link>
        </div>

        <nav aria-label="Mes lieux" className="flex min-h-0 flex-1 flex-col px-3">
          <Link
            href="/dashboard"
            aria-current={onHome ? "page" : undefined}
            className={`mb-1 flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${onHome ? "text-gray-900" : "text-gray-500 hover:text-gray-900"}`}
          >
            Mes lieux
            <span className="tabular-nums">{places.length}</span>
          </Link>
          <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pb-2">
            {places.map((place) => {
              const active = place.id === placeId;
              return (
                <li key={place.id}>
                  <Link
                    href={`/dashboard/places/${place.id}/${section}`}
                    aria-current={active ? "page" : undefined}
                    className={rowClass(active)}
                  >
                    <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md bg-gray-100">
                      {place.coverPhotoUrl && <Image src={place.coverPhotoUrl} alt="" fill sizes="28px" className="object-cover" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{place.name}</span>
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[place.tone]}`} aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
            <li>
              <Link href="/dashboard/places/new" className={rowClass(pathname === "/dashboard/places/new")}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-dashed border-gray-300 text-gray-500">
                  <PlusIcon />
                </span>
                Ajouter un lieu
              </Link>
            </li>
          </ul>
        </nav>

        <div className="shrink-0 space-y-0.5 border-t border-gray-200 p-3">
          <Link href="/dashboard/parametres" className={rowClass(pathname.startsWith("/dashboard/parametres"))}>
            <UserIcon />
            Mon compte
          </Link>
          <Link href="/account" className={rowClass(false)}>
            <ArrowLeftIcon />
            Retour à l&apos;app
          </Link>
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex h-14 w-full shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:hidden">
        {onHome ? (
          <Link href="/account" className="inline-flex min-h-11 items-center gap-2" aria-label="Retour à l'app">
            <Logo size={26} />
            <span className="text-sm font-medium text-gray-500">Pro</span>
          </Link>
        ) : (
          <Link href="/dashboard" className="-ml-1 inline-flex min-h-11 items-center gap-1 rounded-lg px-1 text-sm font-medium text-gray-900">
            <ChevronLeftIcon />
            Mes lieux
          </Link>
        )}
        <span className="flex-1" />
        <Link
          href="/dashboard/parametres"
          aria-label="Mon compte"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        >
          <UserIcon />
        </Link>
      </header>
    </>
  );
}
