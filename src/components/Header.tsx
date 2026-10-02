"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { buttonClass } from "@/lib/ui";
import { Logo } from "@/components/Logo";

const navLinkClass =
  "inline-flex min-h-11 items-center rounded-xl px-3 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20";

export function Header({ user }: { user: User | null }) {
  const pathname = usePathname();
  // /landing is a walled-off page (see proxy.ts) with no way back into the
  // rest of the app on purpose — showing this nav here would undo that the
  // moment someone tapped "Accueil"/"Carte".
  if (pathname === "/landing" || pathname.startsWith("/dashboard")) return null;
  // The logo lives only in this header, and the header is desktop-only: on
  // mobile the bottom nav is the navigation, so there's no top bar at all.

  function linkClass(href: string) {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return `${navLinkClass} ${active ? "font-semibold bg-gray-100 text-gray-900" : "text-gray-700 hover:text-gray-900"}`;
  }

  return (
    <header
      className={`sticky top-0 z-40 border-b border-gray-200 bg-white pt-[env(safe-area-inset-top)] hidden md:block`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          aria-label="Posto, accueil"
          className="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
        >
          <Logo size={32} />
        </Link>
        <nav className="hidden items-center gap-2 text-sm md:flex">
          <Link href="/" className={linkClass("/")}>
            Découvrir
          </Link>
          <Link href="/map" className={linkClass("/map")}>
            Carte
          </Link>
          <Link href="/favorites" className={linkClass("/favorites")}>Favoris</Link>
          {user ? (
            <Link href="/account" className={linkClass("/account")}>
              Mon compte
            </Link>
          ) : (
            <>
              <Link href="/login" className={linkClass("/login")}>
                Connexion
              </Link>
              <Link href="/signup" className={buttonClass("compact")}>
                S’inscrire
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
