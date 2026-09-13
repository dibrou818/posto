"use client";

import Link from "next/link";
import type { Event, Tag } from "@/lib/queries";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { formatEventSchedule, formatRecurrence, formatDuration } from "@/lib/eventSchedule";
import { RestrictionsBadge } from "@/components/RestrictionsBadge";
import { EventForm } from "@/components/dashboard/EventForm";

/** List of a place's events, each linking to its own edit page (title,
 * dates, QR code and poster all live there — see
 * dashboard/places/[id]/evenements/[eventId]) — plus a quick "add" form for
 * a new one, right here, since creating one is the most frequent action on
 * this list. */
export function EventsManager({
  placeId,
  events,
  allTags,
  placeCoverPhotoUrl,
  onCreate,
  onDelete,
}: {
  placeId: string;
  events: Event[];
  allTags: Tag[];
  placeCoverPhotoUrl: string | null;
  onCreate: (formData: FormData) => Promise<void>;
  onDelete: (eventId: string) => Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {events.map((event) => (
          <li key={event.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium text-gray-900">{event.title}</p>
              <p className="text-xs text-gray-500">
                {formatEventSchedule(event.start_datetime, event.end_datetime)}
                {event.recurrence_rule ? ` · ${formatRecurrence(event.recurrence_rule)}` : ""}
                {event.price ? ` · ${event.price}` : ""}
                {formatDuration(event.duration_minutes) ? ` · ${formatDuration(event.duration_minutes)}` : ""}
              </p>
              {event.restrictions && (
                <div className="mt-1">
                  <RestrictionsBadge text={event.restrictions} />
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Link
                href={`/dashboard/places/${placeId}/evenements/${event.id}`}
                className="text-xs font-medium text-gray-600 transition-colors hover:text-gray-900 focus:outline-none focus-visible:underline"
              >
                Modifier
              </Link>
              <DeleteButton
                action={onDelete.bind(null, event.id)}
                confirmMessage={`Supprimer l'événement « ${event.title} » ?`}
              />
            </div>
          </li>
        ))}
        {events.length === 0 && (
          <p className="text-sm text-gray-500">Aucun événement à venir.</p>
        )}
      </ul>

      <div className="rounded-lg border border-dashed border-gray-300 p-3">
        <p className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
          Ajouter un événement
        </p>
        <EventForm allTags={allTags} placeCoverPhotoUrl={placeCoverPhotoUrl} action={onCreate} />
      </div>
    </div>
  );
}
