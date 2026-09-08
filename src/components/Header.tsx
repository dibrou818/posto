import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { SignOutButton } from "@/components/SignOutButton";

export function Header({ user }: { user: User | null }) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-gray-900">
          Posto
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link href="/" className="text-gray-700 hover:text-gray-900">
            Accueil
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
              <Link
                href="/signup"
                className="rounded-md bg-gray-900 px-3 py-1.5 text-white hover:bg-gray-700"
              >
                Créer un compte
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
