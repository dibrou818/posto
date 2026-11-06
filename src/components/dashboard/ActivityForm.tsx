"use client";

import { useState } from "react";
import type { Activity, Tag } from "@/lib/queries";
import { compactInputClass, labelClass } from "@/lib/ui";
import { TextField } from "@/components/ui/TextField";
import { SaveButton } from "@/components/ui/SaveButton";
import { DurationField } from "@/components/ui/DurationField";
import { AccessField } from "@/components/ui/AccessField";
import { ACTIVITY_PRESETS } from "@/lib/activityPresets";
import {
  ACTIVITY_NAME_MAX_LENGTH,
  ACTIVITY_DESCRIPTION_MAX_LENGTH,
  RESTRICTIONS_MAX_LENGTH,
} from "@/lib/fieldLimits";

/** Create-or-edit form for a recurring activity — same create/edit duality
 * as PlaceForm/EventForm (an optional `activity` pre-fills every field and
 * swaps the button's label). Used by the activities list's own inline "add"
 * row and its inline "edit" row (see ActivitiesManager), so the two field
 * sets can never drift apart.
 *
 * The activity type is picked from quick chips (jeux de société,
 * fléchettes, arcade…): one tap fills the name and sets the matching
 * category, so every place describes the same activity the same way — which
 * is what makes it searchable later. The name stays editable free text for
 * anything the chips don't cover. */
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
  const [name, setName] = useState(activity?.name ?? "");
  const [tagId, setTagId] = useState(activity?.tag_id ?? "");
  const idBase = activity?.id ?? "new";

  function pickPreset(label: string, tagSlug: string) {
    setName(label);
    const tag = allTags.find((t) => t.slug === tagSlug);
    if (tag) setTagId(tag.id);
  }

  async function submit(formData: FormData) {
    await action(formData);
    // A create form stays on screen for the next activity — clear what the
    // browser's own form reset doesn't touch (controlled fields).
    if (!activity) {
      setName("");
      setTagId("");
    }
  }

  return (
    <form action={submit} className="flex flex-col gap-4">
      <div>
        <span className={labelClass}>Type d&apos;activité</span>
        <div className="flex flex-wrap gap-1.5">
          {ACTIVITY_PRESETS.map((preset) => {
            const selected = name.trim().toLowerCase() === preset.label.toLowerCase();
            return (
              <button
                key={preset.tagSlug}
                type="button"
                aria-pressed={selected}
                onClick={() => pickPreset(preset.label, preset.tagSlug)}
                className={`min-h-9 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/30 ${
                  selected
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <TextField
        label="Nom affiché"
        name="name"
        placeholder="Ex : Fléchettes, Jeux de société…"
        required
        maxLength={ACTIVITY_NAME_MAX_LENGTH}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <TextField
        label="Description"
        name="description"
        placeholder="Description (optionnel)"
        maxLength={ACTIVITY_DESCRIPTION_MAX_LENGTH}
        defaultValue={activity?.description ?? ""}
      />

      <AccessField idPrefix={`activity-access-${idBase}`} defaultValue={activity?.access} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DurationField label="Durée typique" name="duration_minutes" defaultValue={activity?.duration_minutes} />
        <TextField
          label="Âge ou conditions"
          name="restrictions"
          placeholder="Ex : dès 8 ans, 1m45 minimum"
          maxLength={RESTRICTIONS_MAX_LENGTH}
          defaultValue={activity?.restrictions ?? ""}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor={`activity-tag-${idBase}`}>Catégorie</label>
        <select
          id={`activity-tag-${idBase}`}
          name="tag_id"
          value={tagId}
          onChange={(event) => setTagId(event.target.value)}
          className={compactInputClass}
        >
          <option value="">Celle du lieu</option>
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
          pendingLabel={activity ? "Enregistrement…" : "Ajout…"}
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
