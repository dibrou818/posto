"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SaveEventButton({
  eventId,
  userId,
  initialSaved,
}: {
  eventId: string;
  userId: string | null;
  initialSaved: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  async function toggleSaved() {
    if (!userId) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const result = saved
        ? await supabase.from("event_saves").delete().eq("user_id", userId).eq("event_id", eventId)
        : await supabase.from("event_saves").upsert({ user_id: userId, event_id: eventId }, { onConflict: "user_id,event_id", ignoreDuplicates: true });
      if (result.error) throw result.error;
      setSaved(value => !value);
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
      onClick={toggleSaved}
      disabled={pending}
      aria-busy={pending}
      aria-label={saved ? "Retirer des événements enregistrés" : "Enregistrer l’événement"}
      aria-pressed={saved}
      title={saved ? "Enregistré" : "Enregistrer"}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 disabled:opacity-60 ${
        saved
          ? "border-gray-900 bg-gray-900 text-white"
          : "border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
      }`}
    >
      <svg viewBox="0 0 20 20" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" className="h-4 w-4" aria-hidden="true">
        <path d="M5 3.5h10a1 1 0 0 1 1 1v12l-6-3.6-6 3.6v-12a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
      </svg>
    </button>
    {error && <p role="alert" className="max-w-64 text-sm text-red-700">{error}</p>}
    </div>
  );
}
