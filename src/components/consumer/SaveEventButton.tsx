"use client";

import { FavoriteActionButton } from "@/components/consumer/FavoriteActionButton";

export function SaveEventButton({
  eventId,
  userId,
  initialSaved,
}: {
  eventId: string;
  userId: string | null;
  initialSaved: boolean;
}) {
  return (
    <FavoriteActionButton
      userId={userId}
      active={initialSaved}
      labels={{ off: "Enregistrer", on: "Enregistré" }}
      ariaLabels={{ off: "Enregistrer cet événement", on: "Retirer des événements enregistrés" }}
      prompt={{
        title: "Connectez-vous pour enregistrer cet événement",
        description: "Retrouvez vos événements enregistrés dans vos favoris, sur tous vos appareils.",
      }}
      onToggle={(supabase, uid, saved) =>
        saved
          ? supabase.from("event_saves").delete().eq("user_id", uid).eq("event_id", eventId)
          : supabase
              .from("event_saves")
              .upsert({ user_id: uid, event_id: eventId }, { onConflict: "user_id,event_id", ignoreDuplicates: true })
      }
    />
  );
}
