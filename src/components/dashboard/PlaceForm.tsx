"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database.types";
import { TextField, TextareaField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { labelClass } from "@/lib/ui";

export function PlaceForm({
  place,
  action,
}: {
  place?: Tables<"places">;
  action: (formData: FormData) => Promise<void>;
}) {
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(place?.cover_photo_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
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

    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("place-photos")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("place-photos").getPublicUrl(path);
    setCoverPhotoUrl(data.publicUrl);
    setUploading(false);
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <TextField label="Nom du lieu" name="name" required defaultValue={place?.name} />

      <TextareaField
        label="Description"
        name="description"
        rows={4}
        defaultValue={place?.description ?? ""}
      />

      <TextField label="Adresse" name="address" defaultValue={place?.address ?? ""} />

      <TextField
        label="Téléphone"
        name="phone"
        type="tel"
        placeholder="06 12 34 56 78"
        defaultValue={place?.phone ?? ""}
      />

      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Latitude"
          name="lat"
          type="number"
          step="any"
          required
          defaultValue={place?.lat}
        />
        <TextField
          label="Longitude"
          name="lng"
          type="number"
          step="any"
          required
          defaultValue={place?.lng}
        />
      </div>

      <div>
        <label className={labelClass}>Photo de couverture</label>
        <input type="file" accept="image/*" onChange={handleFileChange} className="text-sm" />
        <input type="hidden" name="cover_photo_url" value={coverPhotoUrl} />
        {uploading && <p className="mt-1 text-xs text-gray-500">Envoi en cours...</p>}
        {coverPhotoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverPhotoUrl} alt="Aperçu" className="mt-2 h-32 w-48 rounded-lg object-cover" />
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={uploading} className="self-start">
        Enregistrer
      </Button>
    </form>
  );
}
