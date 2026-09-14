"use client";

import { useState } from "react";
import type { Event, Tag } from "@/lib/queries";
import { compactInputClass, labelClass } from "@/lib/ui";
import { TextField } from "@/components/ui/TextField";
import { SaveButton } from "@/components/ui/SaveButton";
import { DurationField } from "@/components/ui/DurationField";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { PhotoPickerButton } from "@/components/ui/PhotoPickerButton";
import { useSupabasePhotoUpload } from "@/lib/useSupabasePhotoUpload";
import { toDatetimeLocalValue } from "@/lib/eventSchedule";
import {
  EVENT_TITLE_MAX_LENGTH,
  EVENT_DESCRIPTION_MAX_LENGTH,
  EVENT_RECURRENCE_MAX_LENGTH,
  EVENT_PRICE_MAX_LENGTH,
  RESTRICTIONS_MAX_LENGTH,
} from "@/lib/fieldLimits";

/** Create-or-edit form for an event — same shape as PlaceForm's own
 * create/edit duality (an optional `event` prop pre-fills every field and
 * swaps the button's label; omit it for a blank "add" form). Used both by
 * the events list's own inline "add" row and the dedicated per-event edit
 * page, so the two can never drift apart on validation or field layout. */
export function EventForm({
  event,
  allTags,
  placeCoverPhotoUrl,
  action,
}: {
  event?: Event;
  allTags: Tag[];
  /** Fallback background for the event's poster when it has no cover photo
   * of its own. */
  placeCoverPhotoUrl: string | null;
  action: (formData: FormData) => Promise<void>;
}) {
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(event?.cover_photo_url ?? "");
  const { handleFileChange, uploading, error: uploadError } = useSupabasePhotoUpload(setCoverPhotoUrl, {
    upsert: true,
  });

  return (
    <form action={action} className="flex flex-col gap-3">
      <TextField
        label="Titre"
        name="title"
        placeholder="Titre de l'événement"
        required
        maxLength={EVENT_TITLE_MAX_LENGTH}
        defaultValue={event?.title}
      />
      <TextField
        label="Description"
        name="description"
        placeholder="Description (optionnel)"
        maxLength={EVENT_DESCRIPTION_MAX_LENGTH}
        defaultValue={event?.description ?? ""}
      />
      <div className="flex flex-col gap-3">
        <DateTimeField
          label="Début"
          name="start_datetime"
          required
          defaultValue={toDatetimeLocalValue(event?.start_datetime)}
        />
        <DateTimeField
          label="Fin (optionnel)"
          name="end_datetime"
          defaultValue={toDatetimeLocalValue(event?.end_datetime)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Récurrence"
          name="recurrence_rule"
          placeholder="ex: weekly:thursday"
          maxLength={EVENT_RECURRENCE_MAX_LENGTH}
          defaultValue={event?.recurrence_rule ?? ""}
        />
        <TextField
          label="Prix"
          name="price"
          placeholder="ex: Gratuit / 10€"
          maxLength={EVENT_PRICE_MAX_LENGTH}
          defaultValue={event?.price ?? ""}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <DurationField label="Durée typique" name="duration_minutes" defaultValue={event?.duration_minutes} />
        <TextField
          label="Restriction"
          name="restrictions"
          placeholder="Ex: +18 ans"
          maxLength={RESTRICTIONS_MAX_LENGTH}
          defaultValue={event?.restrictions ?? ""}
        />
      </div>
      <div>
        <label className={labelClass}>Tag</label>
        <select name="tag_id" defaultValue={event?.tag_id ?? ""} className={compactInputClass}>
          <option value="">Hérite des tags du lieu</option>
          {allTags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>
          Photo de l&apos;événement (optionnel — sinon celle du lieu est utilisée)
        </label>
        <PhotoPickerButton id="event-cover-photo" onChange={handleFileChange} />
        <input type="hidden" name="cover_photo_url" value={coverPhotoUrl} />
        {uploading && <p className="mt-1 text-xs text-gray-500">Envoi en cours...</p>}
        {coverPhotoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverPhotoUrl} alt="Aperçu" className="mt-2 h-20 w-32 rounded-lg object-cover" />
        )}
        {!coverPhotoUrl && placeCoverPhotoUrl && (
          <p className="mt-1 text-xs text-gray-400">Utilisera la photo du lieu par défaut.</p>
        )}
        {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
      </div>

      <SaveButton
        className="self-start"
        disabled={uploading}
        savedLabel={event ? "Enregistré" : "Ajouté"}
        pendingLabel={event ? "Enregistrement..." : "Ajout..."}
      >
        {event ? "Enregistrer les modifications" : "Ajouter l'événement"}
      </SaveButton>
    </form>
  );
}
