"use client";

import { useState } from "react";
import type { Tables } from "@/types/database.types";
import type { Tag } from "@/lib/queries";
import { UrgentMessageFields } from "@/components/dashboard/UrgentMessageFields";
import { UnsavedChangesGuard } from "@/components/dashboard/UnsavedChangesGuard";
import { TextField, TextareaField } from "@/components/ui/TextField";
import { PhoneField } from "@/components/ui/PhoneField";
import { SaveButton } from "@/components/ui/SaveButton";
import { PhotoPickerButton } from "@/components/ui/PhotoPickerButton";
import { FormSection, FormActions } from "@/components/dashboard/FormSection";
import { AddressField } from "@/components/dashboard/AddressField";
import { labelClass } from "@/lib/ui";
import { useSupabasePhotoUpload } from "@/lib/useSupabasePhotoUpload";
import {
  PLACE_NAME_MAX_LENGTH as NAME_MAX_LENGTH,
  PLACE_DESCRIPTION_MAX_LENGTH as DESCRIPTION_MAX_LENGTH,
} from "@/lib/fieldLimits";

export function PlaceForm({
  place,
  action,
  allTags,
  selectedTagIds,
}: {
  place?: Tables<"places">;
  action: (formData: FormData) => Promise<void>;
  /** When given, the category picker is part of this same form (one save). */
  allTags?: Tag[];
  selectedTagIds?: string[];
}) {
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(place?.cover_photo_url ?? "");
  const [photoUrls, setPhotoUrls] = useState<string[]>(place?.photo_urls ?? []);
  const coverUpload = useSupabasePhotoUpload(setCoverPhotoUrl, { upsert: true });
  // Unlike the cover photo (one fixed slot), the gallery grows by one photo
  // per upload rather than replacing a single value — each call appends.
  const galleryUpload = useSupabasePhotoUpload(
    (url) => setPhotoUrls((prev) => [...prev, url]),
    { pathPrefix: "gallery-", clearInputAfterUpload: true },
  );
  const error = coverUpload.error ?? galleryUpload.error;

  function removeGalleryPhoto(url: string) {
    setPhotoUrls((prev) => prev.filter((u) => u !== url));
  }

  return (
    <form action={action} className="flex flex-col">
      <UnsavedChangesGuard />
      <FormSection first title="Présentation" description="Ce que les visiteurs lisent en premier sur votre fiche.">
        <TextField label="Nom du lieu" name="name" required maxLength={NAME_MAX_LENGTH} defaultValue={place?.name} />
        <TextareaField
          label="Description"
          name="description"
          rows={4}
          maxLength={DESCRIPTION_MAX_LENGTH}
          defaultValue={place?.description ?? ""}
        />
        <PhoneField name="phone" defaultValue={place?.phone} />
      </FormSection>

      <FormSection title="Adresse" description="Elle sert à placer votre lieu sur la carte.">
        <AddressField
          defaultAddress={place?.address}
          defaultLat={place?.lat}
          defaultLng={place?.lng}
          defaultCity={place?.city}
          defaultPostcode={place?.postcode}
          defaultSuburb={place?.suburb}
        />
      </FormSection>

      <FormSection
        title="Photos"
        description="Plusieurs photos aident bien plus à se décider qu'une seule : intérieur, ambiance, terrain."
      >
        <div>
          <p className={labelClass}>Photo de couverture</p>
          {coverPhotoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverPhotoUrl} alt="Aperçu de la couverture" className="mb-2 aspect-[16/9] w-full max-w-sm rounded-xl object-cover" />
          )}
          <PhotoPickerButton
            id="place-cover-photo"
            onChange={coverUpload.handleFileChange}
            label={coverPhotoUrl ? "Changer la photo" : "Choisir une photo"}
          />
          <input type="hidden" name="cover_photo_url" value={coverPhotoUrl} />
          {coverUpload.uploading && <p className="mt-1 text-sm text-gray-500">Envoi en cours...</p>}
        </div>

        <div>
          <p className={labelClass}>Galerie (optionnel)</p>
          {photoUrls.length > 0 && (
            <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {photoUrls.map((url) => (
                <div key={url} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-100">
                  <input type="hidden" name="photo_urls" value={url} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeGalleryPhoto(url)}
                    aria-label="Supprimer cette photo"
                    className="absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-base text-white transition-colors hover:bg-black/80"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <PhotoPickerButton
            id="place-gallery-photo"
            onChange={galleryUpload.handleFileChange}
            disabled={galleryUpload.uploading}
            label="Ajouter une photo"
          />
          {galleryUpload.uploading && <p className="mt-1 text-sm text-gray-500">Envoi en cours...</p>}
        </div>
      </FormSection>

      <FormSection title="Liens" description="Ajoutés en boutons sur votre fiche publique.">
        <TextField label="Site web" name="website_url" placeholder="monsite.fr" defaultValue={place?.website_url ?? ""} />
        <TextField label="Instagram" name="instagram_url" placeholder="instagram.com/monlieu" defaultValue={place?.instagram_url ?? ""} />
        <TextField label="Facebook" name="facebook_url" placeholder="facebook.com/monlieu" defaultValue={place?.facebook_url ?? ""} />
      </FormSection>

      <FormSection
        title="Message urgent"
        description="Affiché en priorité sur la fiche, par exemple une fermeture exceptionnelle. Vous pouvez le retirer en deux clics depuis le bandeau en haut de page."
      >
        <UrgentMessageFields
          defaultMessage={place?.urgent_message ?? null}
          defaultExpiresAt={place?.urgent_message_expires_at ?? null}
        />
      </FormSection>

      {allTags && (
        <FormSection title="Catégories" description="Elles aident les visiteurs à trouver votre lieu en filtrant.">
          <input type="hidden" name="tags_present" value="1" />
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <label
                key={tag.id}
                className="flex min-h-10 cursor-pointer items-center rounded-full border border-gray-300 px-3.5 text-sm transition-colors hover:bg-gray-50 has-[:checked]:border-gray-900 has-[:checked]:bg-gray-900 has-[:checked]:text-white"
              >
                <input type="checkbox" name="tag_ids" value={tag.id} defaultChecked={selectedTagIds?.includes(tag.id)} className="sr-only" />
                {tag.label}
              </label>
            ))}
          </div>
        </FormSection>
      )}

      {error && <p className="pb-2 text-sm text-red-600">{error}</p>}

      <FormActions>
        <SaveButton disabled={coverUpload.uploading || galleryUpload.uploading}>
          {place ? "Enregistrer les informations" : "Créer le lieu"}
        </SaveButton>
      </FormActions>
    </form>
  );
}
