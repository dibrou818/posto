"use client";

import type { Activity, Tag } from "@/lib/queries";

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
            className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium text-gray-900">{activity.name}</p>
              {activity.description && (
                <p className="text-xs text-gray-500">{activity.description}</p>
              )}
            </div>
            <form action={onDelete.bind(null, activity.id)}>
              <button type="submit" className="text-xs text-red-600 hover:underline">
                Supprimer
              </button>
            </form>
          </li>
        ))}
        {activities.length === 0 && (
          <p className="text-sm text-gray-400">Aucune activité pour l&apos;instant.</p>
        )}
      </ul>

      <form action={onCreate} className="flex flex-col gap-2 rounded-md border border-dashed border-gray-300 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Ajouter une activité
        </p>
        <input
          name="name"
          placeholder="Nom de l'activité"
          required
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        <input
          name="description"
          placeholder="Description (optionnel)"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        <select name="tag_id" className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">
          <option value="">Hérite des tags du lieu</option>
          {allTags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="self-start rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
        >
          Ajouter
        </button>
      </form>
    </div>
  );
}
