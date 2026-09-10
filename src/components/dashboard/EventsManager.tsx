"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Event, Tag } from "@/lib/queries";
import { compactInputClass, labelClass } from "@/lib/ui";
import { SaveButton } from "@/components/ui/SaveButton";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { QrCodeSection } from "@/components/dashboard/QrCodeSection";
import { formatEventSchedule, formatRecurrence } from "@/lib/eventSchedule";

export function EventsManager({
  events,
  allTags,
  onCreate,
  onDelete,
  onGenerateQr,
}: {
  events: Event[];
  allTags: Tag[];
  onCreate: (formData: FormData) => Promise<void>;
  onDelete: (eventId: string) => Promise<void>;
  onGenerateQr: (eventId: string) => Promise<void>;
}) {
  const [coverPhotoUrl, setCoverPhotoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const supabase = createClient();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUploadError("Vous devez être connecté.");
      setUploading(false);
      return;
    }

    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadErr } = await supabase.storage
      .from("place-photos")
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      setUploadError(uploadErr.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("place-photos").getPublicUrl(path);
    setCoverPhotoUrl(data.publicUrl);
    setUploading(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {events.map((event) => (
          <li key={event.id} className="rounded-lg border border-gray-200 text-sm">
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900">{event.title}</p>
                <p className="text-xs text-gray-500">
                  {formatEventSchedule(event.start_datetime, event.end_datetime)}
                  {event.recurrence_rule ? ` · ${formatRecurrence(event.recurrence_rule)}` : ""}
                  {event.price ? ` · ${event.price}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setExpandedEventId((cur) => (cur === event.id ? null : event.id))}
                  className="text-xs font-medium text-gray-600 transition-colors hover:text-gray-900 focus:outline-none focus-visible:underline"
                >
                  {expandedEventId === event.id ? "Fermer" : "Code QR"}
                </button>
                <DeleteButton action={onDelete.bind(null, event.id)} />
              </div>
            </div>
            {expandedEventId === event.id && (
              <div className="border-t border-gray-100 px-3 py-3">
                <QrCodeSection
                  qrCodeUrl={event.qr_code_url}
                  publicPath={`/events/${event.id}`}
                  action={onGenerateQr.bind(null, event.id)}
                />
              </div>
            )}
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
        <div className="grid grid-cols-2 gap-2">
          <input
            name="recurrence_rule"
            placeholder="Récurrence, ex: weekly:thursday"
            className={compactInputClass}
          />
          <input
            name="price"
            placeholder="Prix, ex: Gratuit / 10€"
            className={compactInputClass}
          />
        </div>
        <select name="tag_id" className={compactInputClass}>
          <option value="">Hérite des tags du lieu</option>
          {allTags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.label}
            </option>
          ))}
        </select>

        <div>
          <label className={labelClass}>
            Photo de l&apos;événement (optionnel — sinon celle du lieu est utilisée)
          </label>
          <input type="file" accept="image/*" onChange={handleFileChange} className="text-sm" />
          <input type="hidden" name="cover_photo_url" value={coverPhotoUrl} />
          {uploading && <p className="mt-1 text-xs text-gray-500">Envoi en cours...</p>}
          {coverPhotoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverPhotoUrl} alt="Aperçu" className="mt-2 h-20 w-32 rounded-lg object-cover" />
          )}
          {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
        </div>

        <SaveButton
          size="compact"
          className="self-start"
          disabled={uploading}
          savedLabel="Ajouté"
          pendingLabel="Ajout..."
        >
          Ajouter
        </SaveButton>
      </form>
    </div>
  );
}
