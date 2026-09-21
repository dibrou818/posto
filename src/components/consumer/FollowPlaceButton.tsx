"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function FollowPlaceButton({
  placeId,
  userId,
  initialFollowing,
}: {
  placeId: string;
  userId: string | null;
  initialFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  async function toggleFollow() {
    if (!userId) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const result = following
        ? await supabase.from("place_follows").delete().eq("user_id", userId).eq("place_id", placeId)
        : await supabase.from("place_follows").upsert({ user_id: userId, place_id: placeId }, { onConflict: "user_id,place_id", ignoreDuplicates: true });
      if (result.error) throw result.error;
      setFollowing(value => !value);
      router.refresh();
    } catch {
      setError("Impossible d’enregistrer ce changement. Réessayez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
    <button
      type="button"
      onClick={toggleFollow}
      disabled={pending}
      aria-busy={pending}
      aria-pressed={following}
      className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 disabled:opacity-60 ${
        following
          ? "border-gray-900 bg-gray-900 text-white hover:bg-gray-700"
          : "border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
      }`}
    >
      <span aria-hidden="true">{following ? "✓" : "+"}</span>
      {pending ? "En cours…" : following ? "Suivi" : "Suivre"}
    </button>
    {error && <p role="alert" className="max-w-64 text-sm text-red-700">{error}</p>}
    </div>
  );
}
