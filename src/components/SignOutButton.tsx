"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_CLASS =
  "min-h-11 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20";

/** Signs out of every session (Supabase's `signOut()` default scope is
 * "global" — every device, not just this one), then sends the now-signed-
 * out visitor home. Only rendered from the account settings page — it used
 * to also live in the desktop header, but a sign-out control belongs with
 * the rest of the account's own actions, not duplicated in the nav. */
export function SignOutButton({ className = DEFAULT_CLASS }: { className?: string }) {
  const router = useRouter();
  const supabase = createClient();

  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
      }}
      className={className}
    >
      Se déconnecter
    </button>
  );
}
