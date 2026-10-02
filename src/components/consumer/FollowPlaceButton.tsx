"use client";

import { FavoriteActionButton } from "@/components/consumer/FavoriteActionButton";

export function FollowPlaceButton({
  placeId,
  userId,
  initialFollowing,
}: {
  placeId: string;
  userId: string | null;
  initialFollowing: boolean;
}) {
  return (
    <FavoriteActionButton
      userId={userId}
      active={initialFollowing}
      labels={{ off: "Suivre", on: "Suivi" }}
      ariaLabels={{ off: "Suivre ce lieu", on: "Ne plus suivre ce lieu" }}
      prompt={{
        title: "Connectez-vous pour suivre ce lieu",
        description: "Retrouvez vos lieux suivis dans vos favoris, sur tous vos appareils.",
      }}
      onToggle={(supabase, uid, following) =>
        following
          ? supabase.from("place_follows").delete().eq("user_id", uid).eq("place_id", placeId)
          : supabase
              .from("place_follows")
              .upsert({ user_id: uid, place_id: placeId }, { onConflict: "user_id,place_id", ignoreDuplicates: true })
      }
    />
  );
}
