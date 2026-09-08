"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { SignOutButton } from "@/components/SignOutButton";
import { buttonClass } from "@/lib/ui";

export function Header({ user }: { user: User | null }) {
  const pathname = usePathname();
  // The full-screen map is meant to reach the very top of the viewport on
  // mobile, so the header only shows there from md upward.
  const isFullScreenMap = pathname === "/map";

  return (
    <header
      className={`border-b border-gray-200 bg-white ${isFullScreenMap ? "hidden md:block" : ""}`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-gray-900">
          Posto
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link href="/" className="text-gray-700 hover:text-gray-900">
            Accueil
          </Link>
          <Link href="/map" className="text-gray-700 hover:text-gray-900">
            Carte
          </Link>
          {user ? (
            <>
              <Link href="/dashboard" className="text-gray-700 hover:text-gray-900">
                Mon espace
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-700 hover:text-gray-900">
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
