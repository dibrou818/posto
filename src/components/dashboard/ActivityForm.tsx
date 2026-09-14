"use client";

import type { Activity, Tag } from "@/lib/queries";
import { compactInputClass, labelClass } from "@/lib/ui";
import { TextField } from "@/components/ui/TextField";
import { SaveButton } from "@/components/ui/SaveButton";
import { DurationField } from "@/components/ui/DurationField";
import {
  ACTIVITY_NAME_MAX_LENGTH,
  ACTIVITY_DESCRIPTION_MAX_LENGTH,
  RESTRICTIONS_MAX_LENGTH,
} from "@/lib/fieldLimits";

/** Create-or-edit form for a recurring activity — same create/edit duality
 * as PlaceForm/EventForm (an optional `activity` pre-fills every field and
 * swaps the button's label). Used by the activities list's own inline "add"
 * row and its inline "edit" row (see ActivitiesManager), so the two field
 * sets can never drift apart. */
export function ActivityForm({
  activity,
  allTags,
  action,
  onCancel,
}: {
  activity?: Activity;
  allTags: Tag[];
  action: (formData: FormData) => Promise<void>;
  /** Only set when editing in place inside a list row — lets the owner back
   * out without saving. The "add" form has nothing to cancel back to. */
  onCancel?: () => void;
}) {
  return (
    <form action={action} className="flex flex-col gap-2">
      {/* The compact "add" row (no `activity`) drops the visible <label> to
          stay narrow, but a placeholder alone isn't a reliable accessible
          name for a screen reader (it isn't consistently exposed the way a
          real label/aria-label is, and it disappears the moment someone
          starts typing) — aria-label fills that gap exactly when the
          visible label isn't rendered. */}
      <TextField
        label={activity ? "Nom" : undefined}
        aria-label={activity ? undefined : "Nom de l'activité"}
        name="name"
        placeholder="Nom de l'activité"
        required
        maxLength={ACTIVITY_NAME_MAX_LENGTH}
        defaultValue={activity?.name}
      />
      <TextField
        label={activity ? "Description" : undefined}
        aria-label={activity ? undefined : "Description de l'activité"}
        name="description"
        placeholder="Description (optionnel)"
        maxLength={ACTIVITY_DESCRIPTION_MAX_LENGTH}
        defaultValue={activity?.description ?? ""}
      />
      <div className="grid grid-cols-2 gap-2">
        <DurationField
          label={activity ? "Durée typique" : undefined}
          name="duration_minutes"
          defaultValue={activity?.duration_minutes}
        />
        <TextField
          label="Restriction"
          name="restrictions"
          placeholder="Ex: 1m45 minimum"
          maxLength={RESTRICTIONS_MAX_LENGTH}
          defaultValue={activity?.restrictions ?? ""}
        />
      </div>
      <div>
        {activity && <label className={labelClass}>Tag</label>}
        <select
          name="tag_id"
          aria-label={activity ? undefined : "Tag"}
          defaultValue={activity?.tag_id ?? ""}
          className={compactInputClass}
        >
          <option value="">Hérite des tags du lieu</option>
          {allTags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-3">
        <SaveButton
          size="compact"
          className="self-start"
          savedLabel={activity ? "Enregistrée" : "Ajoutée"}
          pendingLabel={activity ? "Enregistrement..." : "Ajout..."}
        >
          {activity ? "Enregistrer" : "Ajouter"}
        </SaveButton>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}
