"use client";

import type { Event, Tag } from "@/lib/queries";
import { compactInputClass } from "@/lib/ui";
import { Button } from "@/components/ui/Button";
import { DeleteButton } from "@/components/ui/DeleteButton";

export function EventsManager({
  events,
  allTags,
  onCreate,
  onDelete,
}: {
  events: Event[];
  allTags: Tag[];
  onCreate: (formData: FormData) => Promise<void>;
  onDelete: (eventId: string) => Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {events.map((event) => (
          <li
            key={event.id}
            className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium text-gray-900">{event.title}</p>
              <p className="text-xs text-gray-500">
                {new Date(event.start_datetime).toLocaleString("fr-FR")}
                {event.recurrence_rule ? ` · ${event.recurrence_rule}` : ""}
              </p>
            </div>
            <DeleteButton action={onDelete.bind(null, event.id)} />
          </li>
        ))}
        {events.length === 0 && (
          <p className="text-sm text-gray-500">Aucun événement à venir.</p>
        )}
      </ul>

      <form action={onCreate} className="flex flex-col gap-2 rounded-lg border border-dashed border-gray-300 p-3">
        <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
          Ajouter un événement
        </p>
        <input
          name="title"
          placeholder="Titre de l'événement"
          required
          className={compactInputClass}
        />
        <input
          name="description"
          placeholder="Description (optionnel)"
          className={compactInputClass}
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Début</label>
            <input
              type="datetime-local"
              name="start_datetime"
              required
              className={`w-full ${compactInputClass}`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Fin (optionnel)</label>
            <input
              type="datetime-local"
              name="end_datetime"
              className={`w-full ${compactInputClass}`}
            />
          </div>
        </div>
        <input
          name="recurrence_rule"
          placeholder="Récurrence, ex: weekly:thursday (optionnel)"
          className={compactInputClass}
        />
        <select name="tag_id" className={compactInputClass}>
          <option value="">Hérite des tags du lieu</option>
          {allTags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.label}
            </option>
          ))}
        </select>
        <Button type="submit" size="compact" className="self-start">
          Ajouter
        </Button>
      </form>
    </div>
  );
}
