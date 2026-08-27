"use client";

import type { Event, Tag } from "@/lib/queries";

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
            className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium text-gray-900">{event.title}</p>
              <p className="text-xs text-gray-500">
                {new Date(event.start_datetime).toLocaleString("fr-FR")}
                {event.recurrence_rule ? ` · ${event.recurrence_rule}` : ""}
              </p>
            </div>
            <form action={onDelete.bind(null, event.id)}>
              <button type="submit" className="text-xs text-red-600 hover:underline">
                Supprimer
              </button>
            </form>
          </li>
        ))}
        {events.length === 0 && (
          <p className="text-sm text-gray-400">Aucun événement à venir.</p>
        )}
      </ul>

      <form action={onCreate} className="flex flex-col gap-2 rounded-md border border-dashed border-gray-300 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Ajouter un événement
        </p>
        <input
          name="title"
          placeholder="Titre de l'événement"
          required
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        <input
          name="description"
          placeholder="Description (optionnel)"
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Début</label>
            <input
              type="datetime-local"
              name="start_datetime"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Fin (optionnel)</label>
            <input
              type="datetime-local"
              name="end_datetime"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
        </div>
        <input
          name="recurrence_rule"
          placeholder="Récurrence, ex: weekly:thursday (optionnel)"
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
