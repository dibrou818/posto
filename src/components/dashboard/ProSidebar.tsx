"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type ManagedPlace = {
  id: string;
  name: string;
  coverPhotoUrl: string | null;
};

const PLACE_SECTIONS = [
  { slug: "informations", label: "Informations", icon: InfoIcon },
  { slug: "horaires", label: "Horaires", icon: ClockIcon },
  { slug: "activites", label: "Activités", icon: ActivityIcon },
  { slug: "evenements", label: "Événements", icon: CalendarIcon },
  { slug: "parametres", label: "Paramètres du lieu", icon: SettingsIcon },
];

function GridIcon() {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4"><rect x="3" y="3" width="5" height="5" rx="1"/><rect x="12" y="3" width="5" height="5" rx="1"/><rect x="3" y="12" width="5" height="5" rx="1"/><rect x="12" y="12" width="5" height="5" rx="1"/></svg>;
}

function InfoIcon() {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4"><circle cx="10" cy="10" r="7"/><path d="M10 9v5M10 6.2v.1" strokeLinecap="round"/></svg>;
}

function ClockIcon() {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4"><circle cx="10" cy="10" r="7"/><path d="M10 6v4l2.8 1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function ActivityIcon() {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4"><path d="M3 10h3l1.5-4 3 8 1.8-4H17" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function CalendarIcon() {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4"><rect x="3" y="4.5" width="14" height="12.5" rx="2"/><path d="M3 8h14M7 3v3M13 3v3" strokeLinecap="round"/></svg>;
}

function SettingsIcon() {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4"><circle cx="10" cy="10" r="2.5"/><path d="M10 2.8v1.4M10 15.8v1.4M17.2 10h-1.4M4.2 10H2.8M15.1 4.9l-1 1M5.9 14.1l-1 1M15.1 15.1l-1-1M5.9 5.9l-1-1" strokeLinecap="round"/></svg>;
}

function ArrowLeftIcon() {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4"><path d="m11.5 5-5 5 5 5M6.8 10H17" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function CloseIcon() {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5"><path d="m5 5 10 10M15 5 5 15" strokeLinecap="round"/></svg>;
}

function MenuIcon() {
  return <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5"><path d="M3 5.5h14M3 10h14M3 14.5h14" strokeLinecap="round"/></svg>;
}

function SidebarContent({
  places,
  currentPlace,
  onNavigate,
}: {
  places: ManagedPlace[];
  currentPlace: ManagedPlace | null;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const navClass = (active: boolean) =>
    `flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 ${
      active ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    }`;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 px-4 py-4">
        <Link href="/dashboard" onClick={onNavigate} className="inline-flex items-center gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20">
          <span className="text-lg font-bold tracking-tight text-gray-900">Posto</span>
          <span className="rounded-md bg-gray-900 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white">PRO</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <nav className="space-y-1" aria-label="Navigation professionnelle">
          <Link href="/dashboard" onClick={onNavigate} className={navClass(pathname === "/dashboard")}>
            <GridIcon />
            Mes établissements
          </Link>
        </nav>

        {places.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 px-3 text-[11px] font-semibold tracking-[0.12em] text-gray-400 uppercase">Établissement</p>
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-2">
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                {currentPlace?.coverPhotoUrl && <Image src={currentPlace.coverPhotoUrl} alt="" fill sizes="36px" className="object-cover" />}
              </div>
              <select
                aria-label="Choisir un établissement"
                value={currentPlace?.id ?? ""}
                onChange={(event) => {
                  if (event.target.value) {
                    router.push(`/dashboard/places/${event.target.value}/informations`);
                    onNavigate?.();
                  }
                }}
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-gray-900 outline-none"
              >
                {!currentPlace && <option value="">Choisir un lieu</option>}
                {places.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
              </select>
            </div>
          </div>
        )}

        {currentPlace && (
          <nav className="mt-3 space-y-1" aria-label={`Gestion de ${currentPlace.name}`}>
            {PLACE_SECTIONS.map(({ slug, label, icon: Icon }) => {
              const href = `/dashboard/places/${currentPlace.id}/${slug}`;
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link key={slug} href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={navClass(active)}>
                  <Icon />
                  {label}
                </Link>
              );
            })}
            <Link href={`/places/${currentPlace.id}`} onClick={onNavigate} className={navClass(false)}>
              <span className="w-4 text-center text-xs">↗</span>
              Voir la fiche publique
            </Link>
          </nav>
        )}

        <div className="mt-6 border-t border-gray-200 pt-4">
          <Link href="/dashboard/places/new" onClick={onNavigate} className={navClass(pathname === "/dashboard/places/new")}>
            <span className="w-4 text-center text-lg leading-none">+</span>
            Ajouter un établissement
          </Link>
          <Link href="/dashboard/parametres" onClick={onNavigate} className={navClass(pathname === "/dashboard/parametres")}>
            <SettingsIcon />
            Paramètres du compte
          </Link>
        </div>
      </div>

      <div className="border-t border-gray-200 p-3">
        <Link href="/account" onClick={onNavigate} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900">
          <ArrowLeftIcon />
          Retour à mon profil
        </Link>
      </div>
    </div>
  );
}

export function ProSidebar({ places }: { places: ManagedPlace[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const placeId = pathname.match(/^\/dashboard\/places\/([^/]+)/)?.[1];
  const currentPlace = places.find((place) => place.id === placeId) ?? null;

  // A mobile drawer should behave like a real navigation surface: the page
  // behind it stays still, Escape closes it on hardware keyboards, and the
  // lock is always cleaned up if navigation unmounts the component.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.showModal();
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener("change", closeOnDesktop);
      previouslyFocused?.focus();
    };
  }, [open]);

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-gray-200 bg-white lg:block xl:w-72">
        <SidebarContent places={places} currentPlace={currentPlace} />
      </aside>

      <header className="sticky top-0 z-40 flex min-h-14 w-full shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 pt-[env(safe-area-inset-top)] lg:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-label="Ouvrir le menu professionnel" className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-700">
          <MenuIcon />
        </button>
        <span className="flex items-center gap-2 text-sm font-bold text-gray-900">Posto <span className="rounded bg-gray-900 px-1.5 py-0.5 text-[9px] tracking-wider text-white">PRO</span></span>
        <Link href="/account" className="text-xs font-medium text-gray-600">Quitter</Link>
      </header>

      {open && (
        <dialog ref={dialogRef} onCancel={() => setOpen(false)} className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none border-0 bg-transparent p-0 backdrop:bg-black/35" aria-label="Menu professionnel">
          <button type="button" aria-label="Fermer le menu" onClick={() => setOpen(false)} className="absolute inset-0" tabIndex={-1} />
          <aside className="relative h-full w-[min(19rem,88vw)] overflow-hidden bg-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-2xl">
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer le menu" className="absolute top-[calc(env(safe-area-inset-top)+0.75rem)] right-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100">
              <CloseIcon />
            </button>
            <SidebarContent places={places} currentPlace={currentPlace} onNavigate={() => setOpen(false)} />
          </aside>
        </dialog>
      )}
    </>
  );
}
