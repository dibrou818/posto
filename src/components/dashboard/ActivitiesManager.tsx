"use client";

import type { Activity, Tag } from "@/lib/queries";
import { compactInputClass } from "@/lib/ui";
import { TextField } from "@/components/ui/TextField";
import { SaveButton } from "@/components/ui/SaveButton";
import { DeleteButton } from "@/components/ui/DeleteButton";

const NAME_MAX_LENGTH = 80;
const DESCRIPTION_MAX_LENGTH = 300;

export function ActivitiesManager({
  activities,
  allTags,
  onCreate,
  onDelete,
}: {
  activities: Activity[];
  allTags: Tag[];
  onCreate: (formData: FormData) => Promise<void>;
  onDelete: (activityId: string) => Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {activities.map((activity) => (
          <li
            key={activity.id}
            className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium text-gray-900">{activity.name}</p>
              {activity.description && (
                <p className="text-xs text-gray-500">{activity.description}</p>
              )}
            </div>
            <DeleteButton
              action={onDelete.bind(null, activity.id)}
              confirmMessage={`Supprimer l'activité « ${activity.name} » ?`}
            />
          </li>
        ))}
        {activities.length === 0 && (
          <p className="text-sm text-gray-500">Aucune activité pour l&apos;instant.</p>
        )}
      </ul>

      <form action={onCreate} className="flex flex-col gap-2 rounded-lg border border-dashed border-gray-300 p-3">
        <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
          Ajouter une activité
        </p>
        <TextField
          name="name"
          placeholder="Nom de l'activité"
          required
          maxLength={NAME_MAX_LENGTH}
        />
        <TextField
          name="description"
          placeholder="Description (optionnel)"
          maxLength={DESCRIPTION_MAX_LENGTH}
        />
        <select name="tag_id" className={compactInputClass}>
          <option value="">Hérite des tags du lieu</option>
          {allTags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.label}
            </option>
          ))}
        </select>
        <SaveButton size="compact" className="self-start" savedLabel="Ajoutée" pendingLabel="Ajout...">
          Ajouter
        </SaveButton>
      </form>
    </div>
  );
}
