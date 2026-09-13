"use client";

import { useState } from "react";
import type { Activity, Tag } from "@/lib/queries";
import { formatDuration } from "@/lib/eventSchedule";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { RestrictionsBadge } from "@/components/RestrictionsBadge";
import { ActivityForm } from "@/components/dashboard/ActivityForm";

export function ActivitiesManager({
  activities,
  allTags,
  onCreate,
  onUpdate,
  onDelete,
}: {
  activities: Activity[];
  allTags: Tag[];
  onCreate: (formData: FormData) => Promise<void>;
  onUpdate: (activityId: string, formData: FormData) => Promise<void>;
  onDelete: (activityId: string) => Promise<void>;
}) {
  // Activities have no sub-resources of their own (no QR code, no poster,
  // unlike events) — editing one in place, right in its own row, covers the
  // whole thing without needing a dedicated page the way an event does.
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {activities.map((activity) => {
          const isEditing = editingId === activity.id;
          const duration = formatDuration(activity.duration_minutes);
          return (
            <li key={activity.id} className="rounded-lg border border-gray-200 text-sm">
              {isEditing ? (
                <div className="p-3">
                  <ActivityForm
                    activity={activity}
                    allTags={allTags}
                    action={onUpdate.bind(null, activity.id)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">
                      {activity.name}
                      {duration && <span className="ml-1.5 font-normal text-gray-500">· {duration}</span>}
                    </p>
                    {activity.description && (
                      <p className="text-xs text-gray-500">{activity.description}</p>
                    )}
                    {activity.restrictions && (
                      <div className="mt-1">
                        <RestrictionsBadge text={activity.restrictions} />
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingId(activity.id)}
                      className="text-xs font-medium text-gray-600 transition-colors hover:text-gray-900 focus:outline-none focus-visible:underline"
                    >
                      Modifier
                    </button>
                    <DeleteButton
                      action={onDelete.bind(null, activity.id)}
                      confirmMessage={`Supprimer l'activité « ${activity.name} » ?`}
                    />
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {activities.length === 0 && (
          <p className="text-sm text-gray-500">Aucune activité pour l&apos;instant.</p>
        )}
      </ul>

      <div className="rounded-lg border border-dashed border-gray-300 p-3">
        <p className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
          Ajouter une activité
        </p>
        <ActivityForm allTags={allTags} action={onCreate} />
      </div>
    </div>
  );
}
