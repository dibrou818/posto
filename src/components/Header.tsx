"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { SignOutButton } from "@/components/SignOutButton";
import { buttonClass } from "@/lib/ui";

const navLinkClass =
  "rounded-md px-1 py-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20";

export function Header({ user }: { user: User | null }) {
  const pathname = usePathname();
  // The full-screen map is meant to reach the very top of the viewport on
  // mobile, so the header only shows there from md upward.
  const isFullScreenMap = pathname === "/map";

  function linkClass(href: string) {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return `${navLinkClass} ${active ? "font-medium text-gray-900" : "text-gray-700 hover:text-gray-900"}`;
  }

  return (
    <header
      className={`border-b border-gray-200 bg-white ${isFullScreenMap ? "hidden md:block" : ""}`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="rounded-md text-lg font-bold text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
        >
          Posto
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link href="/" className={linkClass("/")}>
            Accueil
          </Link>
          <Link href="/map" className={linkClass("/map")}>
            Carte
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className={linkClass("/dashboard")}>
                Mon espace
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/login" className={linkClass("/login")}>
                Connexion
              </Link>
              <Link href="/signup" className={buttonClass("compact")}>
                Créer un compte
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
