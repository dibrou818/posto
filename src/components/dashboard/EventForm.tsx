"use client";

import { useState } from "react";
import type { Event, Tag } from "@/lib/queries";
import { compactInputClass, labelClass } from "@/lib/ui";
import { TextField } from "@/components/ui/TextField";
import { SaveButton } from "@/components/ui/SaveButton";
import { DurationField } from "@/components/ui/DurationField";
import { DateTimeField } from "@/components/ui/DateTimeField";
import { FormSection, FormActions } from "@/components/dashboard/FormSection";
import { RecurrenceField } from "@/components/ui/RecurrenceField";
import { PriceField } from "@/components/ui/PriceField";
import { PhotoPickerButton } from "@/components/ui/PhotoPickerButton";
import { useSupabasePhotoUpload } from "@/lib/useSupabasePhotoUpload";
import { toDatetimeLocalValue } from "@/lib/eventSchedule";
import {
  EVENT_TITLE_MAX_LENGTH,
  EVENT_DESCRIPTION_MAX_LENGTH,
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
  variant = "panel",
}: {
  event?: Event;
  allTags: Tag[];
  /** Fallback background for the event's poster when it has no cover photo
   * of its own. */
  placeCoverPhotoUrl: string | null;
  action: (formData: FormData) => Promise<void>;
  /** "page" on an event's own edit page (titled sections, sticky save bar);
   * "panel" inside the compact create-an-event panel. */
  variant?: "page" | "panel";
}) {
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(event?.cover_photo_url ?? "");
  const { handleFileChange, uploading, error: uploadError } = useSupabasePhotoUpload(setCoverPhotoUrl, {
    upsert: true,
  });

  const compact = variant === "panel";

  return (
    <form action={action} className={compact ? "flex flex-col gap-4" : "flex flex-col"}>
      <FormSection first title="L'essentiel" description="Le titre et la description affichés sur la page de l'événement." compact={compact}>
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
      </FormSection>

      <FormSection title="Date et heure" description="Pour un rendez-vous qui revient, choisissez une récurrence." compact={compact}>
        <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-2">
          <DateTimeField label="Début" name="start_datetime" required defaultValue={toDatetimeLocalValue(event?.start_datetime)} />
          <DateTimeField label="Fin (optionnel)" name="end_datetime" defaultValue={toDatetimeLocalValue(event?.end_datetime)} />
        </div>
        <RecurrenceField label="Récurrence" name="recurrence_rule" defaultValue={event?.recurrence_rule} />
      </FormSection>

      <FormSection title="Tarif et public" description="Ce qui aide à décider avant de venir." compact={compact}>
        <PriceField label="Prix" defaultCents={event?.price_cents} defaultUnit={event?.price_unit} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DurationField label="Durée typique" name="duration_minutes" defaultValue={event?.duration_minutes} />
          <TextField
            label="Restriction"
            name="restrictions"
            placeholder="Ex: +18 ans"
            maxLength={RESTRICTIONS_MAX_LENGTH}
            defaultValue={event?.restrictions ?? ""}
          />
        </div>
      </FormSection>

      <FormSection title="Catégorie" description="Sans tag, l'événement reprend ceux de votre lieu." compact={compact}>
        <div>
          <label className={labelClass} htmlFor={`event-tag-${event?.id ?? "new"}`}>Tag</label>
          <select id={`event-tag-${event?.id ?? "new"}`} name="tag_id" defaultValue={event?.tag_id ?? ""} className={compactInputClass}>
            <option value="">Hérite des tags du lieu</option>
            {allTags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.label}
              </option>
            ))}
          </select>
        </div>
      </FormSection>

      <FormSection title="Photo" description="Sans photo, celle de votre lieu est utilisée." compact={compact}>
        <div>
          {coverPhotoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverPhotoUrl} alt="Aperçu" className="mb-2 aspect-[16/9] w-full max-w-sm rounded-xl object-cover" />
          )}
          <PhotoPickerButton
            id={`event-cover-photo-${event?.id ?? "new"}`}
            onChange={handleFileChange}
            label={coverPhotoUrl ? "Changer la photo" : "Choisir une photo"}
          />
          <input type="hidden" name="cover_photo_url" value={coverPhotoUrl} />
          {uploading && <p className="mt-1 text-sm text-gray-500">Envoi en cours...</p>}
          {!coverPhotoUrl && placeCoverPhotoUrl && (
            <p className="mt-1 text-sm text-gray-500">La photo du lieu sera utilisée par défaut.</p>
          )}
          {uploadError && <p className="mt-1 text-sm text-red-600">{uploadError}</p>}
        </div>
      </FormSection>

      <FormActions compact={compact}>
        <SaveButton
          disabled={uploading}
          savedLabel={event ? "Enregistré" : "Ajouté"}
          pendingLabel={event ? "Enregistrement..." : "Ajout..."}
        >
          {event ? "Enregistrer les modifications" : "Ajouter l'événement"}
        </SaveButton>
      </FormActions>
    </form>
  );
}
