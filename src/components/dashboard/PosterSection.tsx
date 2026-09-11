"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Event } from "@/lib/queries";
import { generateEventPosterBlob } from "@/lib/poster";
import { buttonClass } from "@/lib/ui";
import { DeleteButton } from "@/components/ui/DeleteButton";

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M4 10.5 8 14.5 16 5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Poster generator + preview for an event, right next to its QR code (same
 * "one click, direct result" shape as QrCodeSection). Generation itself
 * can't be a plain `<form action>` like the QR one — compositing needs a
 * browser canvas, which a server action doesn't have — so this drives its
 * own async handler: composite → upload to Storage → hand the resulting
 * URL to the server action that persists it on the event. */
export function PosterSection({
  event,
  placeCoverPhotoUrl,
  onSave,
  onDelete,
}: {
  event: Event;
  /** Falls back to the place's own cover photo when the event has none of
   * its own — same rule EventsManager's create form already documents. */
  placeCoverPhotoUrl: string | null;
  onSave: (posterUrl: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [status, setStatus] = useState<"idle" | "generating" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [localDownloadUrl, setLocalDownloadUrl] = useState<string | null>(null);
  const localDownloadUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (localDownloadUrlRef.current) URL.revokeObjectURL(localDownloadUrlRef.current);
    };
  }, []);

  async function handleGenerate() {
    setStatus("generating");
    setError(null);
    try {
      const blob = await generateEventPosterBlob({
        title: event.title,
        description: event.description,
        startDatetime: event.start_datetime,
        endDatetime: event.end_datetime,
        price: event.price,
        coverPhotoUrl: event.cover_photo_url ?? placeCoverPhotoUrl,
        qrTargetUrl: `${window.location.origin}/events/${event.id}`,
      });

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Vous devez être connecté.");

      // A fresh path per generation (not a fixed name overwritten in place)
      // so the server action can clean up the previous file explicitly —
      // upsert-in-place would race with anyone still viewing the old one.
      const path = `${user.id}/posters/${event.id}-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from("place-photos")
        .upload(path, blob, { contentType: "image/png" });
      if (uploadError) throw new Error(uploadError.message);

      const { data } = supabase.storage.from("place-photos").getPublicUrl(path);
      await onSave(data.publicUrl);

      if (localDownloadUrlRef.current) URL.revokeObjectURL(localDownloadUrlRef.current);
      const objectUrl = URL.createObjectURL(blob);
      localDownloadUrlRef.current = objectUrl;
      setLocalDownloadUrl(objectUrl);

      setStatus("done");
      setTimeout(() => setStatus((s) => (s === "done" ? "idle" : s)), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
      setStatus("idle");
    }
  }

  const posterUrl = event.poster_url;
  // The just-generated blob downloads reliably cross-browser (a same-origin
  // blob: URL); a poster loaded from a previous visit falls back to the
  // stored Storage URL, which most browsers still handle fine.
  const downloadHref = localDownloadUrl ?? posterUrl ?? undefined;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white">
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={posterUrl} alt="Affiche de l'événement" className="h-full w-full object-cover" />
        ) : (
          <span className="px-2 text-center text-xs text-gray-400">Pas encore générée</span>
        )}
      </div>
      <div className="flex flex-col items-start gap-2">
        <p className="text-xs text-gray-500">
          Composée à partir de la photo, du titre, de la description, de la date et du prix — avec
          le code QR de l&apos;événement.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={status === "generating"}
            className={buttonClass("compact")}
          >
            {status === "generating" ? "Génération..." : posterUrl ? "Mettre à jour l'affiche" : "Générer l'affiche"}
          </button>
          {status === "done" && (
            <span className="flex items-center gap-1 text-sm font-medium text-green-600">
              <CheckIcon />
              Générée ✓
            </span>
          )}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {posterUrl && (
          <div className="flex items-center gap-3">
            <a
              href={downloadHref}
              download="affiche-evenement.png"
              className="text-xs font-medium text-gray-700 underline transition-colors hover:text-gray-900"
            >
              Télécharger l&apos;image
            </a>
            <DeleteButton
              action={onDelete}
              label="Supprimer l'affiche"
              confirmMessage="Supprimer cette affiche ? Vous pourrez en régénérer une nouvelle à tout moment."
            />
          </div>
        )}
      </div>
    </div>
  );
}
