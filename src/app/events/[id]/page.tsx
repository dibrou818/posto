import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEventById } from "@/lib/queries";
import { BackButton } from "@/components/ui/BackButton";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const event = await getEventById(supabase, id);

  if (!event) notFound();

  const { place } = event;
  const start = new Date(event.start_datetime);
  const end = event.end_datetime ? new Date(event.end_datetime) : null;
  const isPast = (end ?? start).getTime() < new Date().getTime();

  // Same day: "mercredi 9 septembre 2026, 19:00 - 23:00"; different days:
  // full date on both ends.
  const sameDay = end ? start.toDateString() === end.toDateString() : true;
  const dateLabel = sameDay
    ? `${dateFormatter.format(start)}, ${timeFormatter.format(start)}${end ? ` - ${timeFormatter.format(end)}` : ""}`
    : `${dateFormatter.format(start)} ${timeFormatter.format(start)} - ${end ? `${dateFormatter.format(end)} ${timeFormatter.format(end)}` : ""}`;

  // The event can have its own photo; falls back to the place's when it
  // doesn't bother setting one.
  const coverPhotoUrl = event.cover_photo_url ?? place.cover_photo_url;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="relative mb-4 h-64 w-full overflow-hidden rounded-xl bg-gray-100">
        {coverPhotoUrl && (
          <Image
            src={coverPhotoUrl}
            alt={event.title}
            fill
            sizes="768px"
            className="object-cover"
            priority
          />
        )}
        <div className="absolute top-3 left-3">
          <BackButton fallbackHref="/" />
        </div>
      </div>

      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
            isPast ? "bg-gray-100 text-gray-500" : "bg-green-100 text-green-700"
          }`}
        >
          {isPast ? "Terminé" : "À venir"}
        </span>
      </div>

      <p className="mt-1 text-sm text-gray-500">{dateLabel}</p>
      {event.recurrence_rule && (
        <p className="mt-0.5 text-xs text-gray-500">Récurrence : {event.recurrence_rule}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {place.phone && (
          <a
            href={`tel:${place.phone}`}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/30 focus-visible:ring-offset-2"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M3.654 1.328a.678.678 0 0 1 1.015-.063l2.008 2.008a.678.678 0 0 1 .166.685l-.622 2.072a.678.678 0 0 0 .166.685l4.898 4.898a.678.678 0 0 0 .685.166l2.072-.622a.678.678 0 0 1 .685.166l2.008 2.008a.678.678 0 0 1-.063 1.015l-1.462 1.146a1.678 1.678 0 0 1-1.665.229C10.4 14.34 5.66 9.6 4.279 6.455a1.678 1.678 0 0 1 .23-1.665l1.145-1.462Z" />
            </svg>
            Appeler {place.phone}
          </a>
        )}
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
            <path d="M10 18s6-5.5 6-10a6 6 0 1 0-12 0c0 4.5 6 10 6 10Z" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="10" cy="8" r="2.2" />
          </svg>
          Itinéraire
        </a>
      </div>

      {event.price && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-gray-900 px-2.5 py-1 text-xs font-medium text-white">
            {event.price}
          </span>
        </div>
      )}

      {event.description && (
        <p className="mt-4 whitespace-pre-line text-sm text-gray-700">{event.description}</p>
      )}

      <section className="mt-8">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Lieu</h2>
        <Link
          href={`/places/${place.id}`}
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
        >
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
            {place.cover_photo_url && (
              <Image src={place.cover_photo_url} alt={place.name} fill sizes="56px" className="object-cover" />
            )}
          </div>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-gray-900">{place.name}</span>
            {place.address && (
              <span className="block truncate text-xs text-gray-500">{place.address}</span>
            )}
          </span>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0 text-gray-400">
            <path d="M7.5 4.5 13 10l-5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </section>
    </div>
  );
}
