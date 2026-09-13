"use client";

import { useState, type ChangeEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { PLACE_PHOTOS_BUCKET } from "@/lib/storage";

type UploadOptions = {
  /** Prefixed onto the generated filename (e.g. "gallery-") — lets two
   * upload flows on the same form (a cover photo and a gallery) share one
   * bucket without ever colliding on the same path. */
  pathPrefix?: string;
  /** Whether re-uploading under the exact same path replaces the existing
   * file. Only the cover-photo flows need this (uploading a new cover photo
   * reuses that owner's same-shaped path); the gallery never re-uses a
   * path, so leaving this off there matches Storage's own default. */
  upsert?: boolean;
  /** Clears the <input> value after a successful upload, so selecting the
   * exact same file again still fires a change event. Only the gallery
   * needs this — the cover-photo slot is replaced wholesale each time, not
   * added to, so there's no reason to pick the same file twice in a row. */
  clearInputAfterUpload?: boolean;
};

/** Shared "pick a file → upload to Supabase Storage → get its public URL"
 * flow behind the dashboard's photo pickers (a place's cover photo, its
 * gallery, an event's cover photo) — same bucket, same auth check, same
 * path shape, just handed a different `onUploaded` per picker. */
export function useSupabasePhotoUpload(onUploaded: (publicUrl: string) => void, options: UploadOptions = {}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Vous devez être connecté.");
      setUploading(false);
      return;
    }

    const path = `${user.id}/${options.pathPrefix ?? ""}${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from(PLACE_PHOTOS_BUCKET)
      .upload(path, file, options.upsert ? { upsert: true } : undefined);

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from(PLACE_PHOTOS_BUCKET).getPublicUrl(path);
    onUploaded(data.publicUrl);
    setUploading(false);
    if (options.clearInputAfterUpload) e.target.value = "";
  }

  return { handleFileChange, uploading, error };
}
