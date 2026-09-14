"use client";

import { useState } from "react";
import type { Tables } from "@/types/database.types";
import { TextField, TextareaField } from "@/components/ui/TextField";
import { PhoneField } from "@/components/ui/PhoneField";
import { SaveButton } from "@/components/ui/SaveButton";
import { PhotoPickerButton } from "@/components/ui/PhotoPickerButton";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { labelClass } from "@/lib/ui";
import { useSupabasePhotoUpload } from "@/lib/useSupabasePhotoUpload";
import { toDatetimeLocalValue } from "@/lib/eventSchedule";
import {
  PLACE_NAME_MAX_LENGTH as NAME_MAX_LENGTH,
  PLACE_DESCRIPTION_MAX_LENGTH as DESCRIPTION_MAX_LENGTH,
  URGENT_MESSAGE_MAX_LENGTH,
} from "@/lib/fieldLimits";

export function PlaceForm({
  place,
  action,
}: {
  place?: Tables<"places">;
  action: (formData: FormData) => Promise<void>;
}) {
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(place?.cover_photo_url ?? "");
  const [photoUrls, setPhotoUrls] = useState<string[]>(place?.photo_urls ?? []);
  const [address, setAddress] = useState(place?.address ?? "");
  const [lat, setLat] = useState(place?.lat !== undefined ? String(place.lat) : "");
  const [lng, setLng] = useState(place?.lng !== undefined ? String(place.lng) : "");
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

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

  // Most place owners have no idea what their GPS coordinates are — this
  // turns the address they just typed into lat/lng automatically, via the
  // same free geocoder used elsewhere in the app, so the two number fields
  // below are a fallback to check/tweak rather than something to fill in by
  // hand from scratch.
  async function handleLocate() {
    if (!address.trim()) {
      setGeocodeError("Renseignez d'abord une adresse.");
      return;
    }
    setGeocoding(true);
    setGeocodeError(null);
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
      const data = await res.json();
      if (!res.ok) {
        setGeocodeError(data.error ?? "Adresse introuvable.");
        return;
      }
      setLat(String(data.lat));
      setLng(String(data.lng));
    } catch {
      setGeocodeError("Géocodage indisponible, réessayez.");
    } finally {
      setGeocoding(false);
    }
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <TextField
        label="Nom du lieu"
        name="name"
        required
        maxLength={NAME_MAX_LENGTH}
        defaultValue={place?.name}
      />

      <TextareaField
        label="Description"
        name="description"
        rows={4}
        maxLength={DESCRIPTION_MAX_LENGTH}
        defaultValue={place?.description ?? ""}
      />

      <PhoneField name="phone" defaultValue={place?.phone} />

      <div>
        <TextField
          label="Adresse"
          name="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={handleLocate}
            disabled={geocoding}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 disabled:opacity-50"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-3.5 w-3.5">
              <path d="M10 18s6-5.5 6-10a6 6 0 1 0-12 0c0 4.5 6 10 6 10Z" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="10" cy="8" r="2.2" />
            </svg>
            {geocoding ? "Localisation..." : "Localiser à partir de l'adresse"}
          </button>
          {lat && lng && !geocodeError && (
            <span className="text-xs text-green-600">Coordonnées trouvées ✓</span>
          )}
        </div>
        {geocodeError && <p className="mt-1 text-xs text-red-600">{geocodeError}</p>}
      </div>

      <div>
        <p className={labelClass}>Coordonnées GPS</p>
        <p className="mb-2 -mt-0.5 text-xs text-gray-500">
          Remplies automatiquement par le bouton ci-dessus — modifiables si besoin.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Latitude"
            name="lat"
            type="number"
            step="any"
            required
            value={lat}
            onChange={(e) => setLat(e.target.value)}
          />
          <TextField
            label="Longitude"
            name="lng"
            type="number"
            step="any"
            required
            value={lng}
            onChange={(e) => setLng(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Photo de couverture</label>
        <PhotoPickerButton id="place-cover-photo" onChange={coverUpload.handleFileChange} />
        <input type="hidden" name="cover_photo_url" value={coverPhotoUrl} />
        {coverUpload.uploading && <p className="mt-1 text-xs text-gray-500">Envoi en cours...</p>}
        {coverPhotoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverPhotoUrl} alt="Aperçu" className="mt-2 h-32 w-48 rounded-lg object-cover" />
        )}
      </div>

      <div>
        <label className={labelClass}>Galerie photo (optionnel)</label>
        <p className="mb-2 -mt-0.5 text-xs text-gray-500">
          Intérieur, ambiance, terrain... plusieurs photos aident bien plus à se décider qu&apos;une
          seule.
        </p>
        <PhotoPickerButton
          id="place-gallery-photo"
          onChange={galleryUpload.handleFileChange}
          disabled={galleryUpload.uploading}
          label="Ajouter une photo"
        />
        {galleryUpload.uploading && <p className="mt-1 text-xs text-gray-500">Envoi en cours...</p>}
        {photoUrls.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {photoUrls.map((url) => (
              <div key={url} className="relative h-20 w-28 overflow-hidden rounded-lg bg-gray-100">
                <input type="hidden" name="photo_urls" value={url} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeGalleryPhoto(url)}
                  aria-label="Supprimer cette photo"
                  className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white transition-colors hover:bg-black/80"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TextField label="Site web" name="website_url" placeholder="monsite.fr" defaultValue={place?.website_url ?? ""} />
        <TextField
          label="Instagram"
          name="instagram_url"
          placeholder="instagram.com/monlieu"
          defaultValue={place?.instagram_url ?? ""}
        />
        <TextField
          label="Facebook"
          name="facebook_url"
          placeholder="facebook.com/monlieu"
          defaultValue={place?.facebook_url ?? ""}
        />
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="mb-2 text-xs font-medium text-amber-800 uppercase tracking-wide">
          Message urgent (optionnel)
        </p>
        <p className="mb-2 -mt-1 text-xs text-amber-700">
          Affiché en priorité sur la fiche publique — ex. &quot;Fermeture exceptionnelle ce
          soir&quot;. Se masque automatiquement après la date d&apos;expiration.
        </p>
        <TextareaField
          label="Message urgent"
          name="urgent_message"
          rows={2}
          maxLength={URGENT_MESSAGE_MAX_LENGTH}
          placeholder="Fermeture exceptionnelle le 15 septembre..."
          defaultValue={place?.urgent_message ?? ""}
          className="border-amber-300"
        />
        <div className="mt-2">
          <DateTimeField
            label="Expire le"
            name="urgent_message_expires_at"
            defaultValue={toDatetimeLocalValue(place?.urgent_message_expires_at)}
            className="border-amber-300"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <SaveButton disabled={coverUpload.uploading || galleryUpload.uploading} className="self-start">
        {place ? "Enregistrer les informations" : "Créer le lieu"}
      </SaveButton>
    </form>
  );
}
