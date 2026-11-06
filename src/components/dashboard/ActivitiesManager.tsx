"use client";

import { useState } from "react";
import type { Activity, Tag } from "@/lib/queries";
import { formatDuration } from "@/lib/eventSchedule";
import { accessLabel } from "@/lib/access";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { ActivityForm } from "@/components/dashboard/ActivityForm";
import { buttonClass } from "@/lib/ui";
import { PlusIcon } from "@/components/ui/PlusIcon";

const textButtonClass =
  "inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20";

/** The activities of a place — same shape as the events list: one button to
 * add, then a plain list. Activities have no QR code or poster, so adding
 * and editing happen right here, the form taking the row's place. */
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
  const [adding, setAdding] = useState(activities.length === 0);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="posto-heading text-lg text-gray-900">
          Activités <span className="font-normal text-gray-400 tabular-nums">{activities.length}</span>
        </h2>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className={buttonClass("compact", "shrink-0 px-4")}>
            <PlusIcon />
            Nouvelle activité
          </button>
        )}
      </div>
      <p className="mb-4 text-sm text-gray-500">
        Ce que l&apos;on peut faire chez vous toute l&apos;année : jeux de société, fléchettes, arcade…
      </p>

      <ul className="divide-y divide-gray-200 border-y border-gray-200">
        {adding && (
          <li className="py-5">
            <p className="mb-4 font-medium text-gray-900">Nouvelle activité</p>
            <ActivityForm allTags={allTags} action={onCreate} onCancel={activities.length > 0 ? () => setAdding(false) : undefined} />
          </li>
        )}
        {activities.map((activity) => {
          if (editingId === activity.id) {
            return (
              <li key={activity.id} className="py-5">
                <ActivityForm
                  activity={activity}
                  allTags={allTags}
                  action={onUpdate.bind(null, activity.id)}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            );
          }
          const meta = [formatDuration(activity.duration_minutes), accessLabel(activity.access), activity.restrictions].filter(Boolean);
          return (
            <li key={activity.id} className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{activity.name}</p>
                {(activity.description || meta.length > 0) && (
                  <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">
                    {[activity.description, ...meta].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <div className="-ml-3 flex shrink-0 items-center gap-1 sm:ml-0">
                <button type="button" onClick={() => setEditingId(activity.id)} className={textButtonClass}>
                  Modifier
                </button>
                <DeleteButton
                  action={onDelete.bind(null, activity.id)}
                  confirmMessage={`Supprimer l'activité « ${activity.name} » ?`}
                  className="min-h-10 rounded-lg px-3 text-sm hover:bg-red-50 hover:no-underline"
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
