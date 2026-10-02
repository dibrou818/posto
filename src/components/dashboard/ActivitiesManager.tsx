"use client";

import { useState } from "react";
import type { Activity, Tag } from "@/lib/queries";
import { formatDuration } from "@/lib/eventSchedule";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { RestrictionsBadge } from "@/components/RestrictionsBadge";
import { ActivityForm } from "@/components/dashboard/ActivityForm";
import { buttonClass } from "@/lib/ui";

/** The activities of a place — same list-then-create shape as the events
 * list (header with a count, the create form folded behind one button,
 * a card per item). Activities have no QR code or poster, so editing one
 * happens in place in its own row instead of on a separate page. */
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
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-gray-900">Activités</h2>
        <span className="text-sm text-gray-500">{activities.length}</span>
      </div>

      <details className="group rounded-2xl border border-gray-200 bg-white" open={activities.length === 0}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
          <span className="text-sm text-gray-600">Ce que l&apos;on peut faire chez vous toute l&apos;année : billard, karaoké, escalade…</span>
          <span className={buttonClass("compact", "shrink-0 group-open:hidden")}>+ Ajouter</span>
          <span className="hidden shrink-0 text-sm font-medium text-gray-600 group-open:inline">Fermer</span>
        </summary>
        <div className="border-t border-gray-200 p-4 sm:p-5">
          <ActivityForm allTags={allTags} action={onCreate} />
        </div>
      </details>

      {activities.length > 0 && (
        <ul className="flex flex-col gap-3">
          {activities.map((activity) => {
            const isEditing = editingId === activity.id;
            const duration = formatDuration(activity.duration_minutes);
            return (
              <li key={activity.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                {isEditing ? (
                  <ActivityForm
                    activity={activity}
                    allTags={allTags}
                    action={onUpdate.bind(null, activity.id)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">
                        {activity.name}
                        {duration && <span className="ml-1.5 font-normal text-gray-500">· {duration}</span>}
                      </p>
                      {activity.description && <p className="mt-0.5 text-sm text-gray-500">{activity.description}</p>}
                      {activity.restrictions && (
                        <div className="mt-1.5">
                          <RestrictionsBadge text={activity.restrictions} />
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(activity.id)}
                        className="inline-flex min-h-10 items-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
                      >
                        Modifier
                      </button>
                      <DeleteButton
                        action={onDelete.bind(null, activity.id)}
                        confirmMessage={`Supprimer l'activité « ${activity.name} » ?`}
                        className="min-h-10 rounded-lg border border-red-200 px-3 text-sm hover:bg-red-50 hover:no-underline"
                      />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
