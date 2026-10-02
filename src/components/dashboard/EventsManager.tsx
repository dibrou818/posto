import Link from "next/link";
import type { Event, Tag } from "@/lib/queries";
import type { QrScanStats } from "@/lib/qrScans";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { formatEventSchedule, formatRecurrence, formatDuration, formatPrice } from "@/lib/eventSchedule";
import { getEventStatus } from "@/lib/dashboardEventStatus";
import { RestrictionsBadge } from "@/components/RestrictionsBadge";
import { EventForm } from "@/components/dashboard/EventForm";
import { buttonClass } from "@/lib/ui";
import { LinkButton } from "@/components/ui/LinkButton";

const dayFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric" });
const monthFormat = new Intl.DateTimeFormat("fr-FR", { month: "short" });

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M4 10.5 8 14.5 16 5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path d="M4 9a5 5 0 0 1 8.5-3.5L15 8M16 11a5 5 0 0 1-8.5 3.5L5 12" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 4v4h-4M5 16v-4h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const quickActionClass =
  "inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20";

function EventRow({
  placeId,
  event,
  scanStats,
  onDelete,
}: {
  placeId: string;
  event: Event;
  scanStats: QrScanStats | undefined;
  onDelete: (eventId: string) => Promise<void>;
}) {
  const status = getEventStatus(event);
  const priceLabel = formatPrice(event.price_cents, event.price_unit);
  const duration = formatDuration(event.duration_minutes);
  const base = `/dashboard/places/${placeId}/evenements/${event.id}`;
  const start = new Date(event.start_datetime);
  const hasQr = Boolean(event.qr_code_url);
  const hasPoster = Boolean(event.poster_url);

  return (
    <li className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-gray-100 text-gray-900">
          {event.recurrence_rule ? (
            <RepeatIcon />
          ) : (
            <>
              <span className="text-base leading-none font-bold">{dayFormat.format(start)}</span>
              <span className="mt-0.5 text-[10px] leading-none font-medium text-gray-500 uppercase">{monthFormat.format(start).replace(".", "")}</span>
            </>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link href={base} className="truncate font-semibold text-gray-900 hover:underline focus:outline-none focus-visible:underline">
              {event.title}
            </Link>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
          </div>
          <p className="mt-0.5 text-sm text-gray-500">
            {formatEventSchedule(event.start_datetime, event.end_datetime)}
            {event.recurrence_rule ? ` · ${formatRecurrence(event.recurrence_rule)}` : ""}
            {priceLabel ? ` · ${priceLabel}` : ""}
            {duration ? ` · ${duration}` : ""}
          </p>
          {event.restrictions && (
            <div className="mt-1">
              <RestrictionsBadge text={event.restrictions} />
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
        <Link href={base} className={`${quickActionClass} border-gray-300 bg-white text-gray-900 hover:bg-gray-50`}>
          Modifier
        </Link>
        <Link
          href={`${base}?tab=qr`}
          className={`${quickActionClass} ${hasQr ? "border-gray-300 bg-white text-gray-900 hover:bg-gray-50" : "border-dashed border-gray-400 bg-white text-gray-700 hover:bg-gray-50"}`}
        >
          {hasQr && <CheckIcon />}
          Code QR
          <span className="text-xs font-normal text-gray-500">
            {!hasQr ? "à générer" : scanStats ? `${scanStats.total} scan${scanStats.total > 1 ? "s" : ""}` : ""}
          </span>
        </Link>
        <Link
          href={`${base}?tab=affiche`}
          className={`${quickActionClass} ${hasPoster ? "border-gray-300 bg-white text-gray-900 hover:bg-gray-50" : "border-dashed border-gray-400 bg-white text-gray-700 hover:bg-gray-50"}`}
        >
          {hasPoster && <CheckIcon />}
          Affiche
          {!hasPoster && <span className="text-xs font-normal text-gray-500">à créer</span>}
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <LinkButton href={`/events/${event.id}`} icon="external">
            Voir
          </LinkButton>
          <DeleteButton
            action={onDelete.bind(null, event.id)}
            confirmMessage={`Supprimer l'événement « ${event.title} » ? Son code QR et son affiche seront aussi supprimés.`}
            className="min-h-10 rounded-lg border border-red-200 px-3 text-sm hover:bg-red-50 hover:no-underline"
          />
        </div>
      </div>
    </li>
  );
}

/** The events list of a place: the "create" form folded behind one clear
 * button at the top, then the events grouped by what matters (coming up,
 * then past), each with its next steps (edit, QR code, poster) one click
 * away instead of buried inside the edit page. */
export function EventsManager({
  placeId,
  events,
  allTags,
  placeCoverPhotoUrl,
  scanStatsById,
  onCreate,
  onDelete,
}: {
  placeId: string;
  events: Event[];
  allTags: Tag[];
  placeCoverPhotoUrl: string | null;
  scanStatsById: Record<string, QrScanStats>;
  onCreate: (formData: FormData) => Promise<void>;
  onDelete: (eventId: string) => Promise<void>;
}) {
  const now = new Date();
  const active: Event[] = [];
  const past: Event[] = [];
  for (const event of events) {
    (getEventStatus(event, now).key === "past" ? past : active).push(event);
  }
  // Soonest first for what's coming; most recent first for what's over.
  active.sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
  past.sort((a, b) => new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-gray-900">Événements</h2>
        <span className="text-sm text-gray-500">
          {active.length} à venir{past.length > 0 ? ` · ${past.length} passé${past.length > 1 ? "s" : ""}` : ""}
        </span>
      </div>

      <details className="group rounded-2xl border border-gray-200 bg-white" open={events.length === 0}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
          <span className="text-sm text-gray-600">Un quiz, une soirée, un tournoi ? Publiez-le en quelques champs.</span>
          <span className={buttonClass("compact", "shrink-0 group-open:hidden")}>+ Créer un événement</span>
          <span className="hidden shrink-0 text-sm font-medium text-gray-600 group-open:inline">Fermer</span>
        </summary>
        <div className="border-t border-gray-200 p-4 sm:p-5">
          <EventForm allTags={allTags} placeCoverPhotoUrl={placeCoverPhotoUrl} action={onCreate} />
        </div>
      </details>

      {active.length > 0 && (
        <ul className="flex flex-col gap-3">
          {active.map((event) => (
            <EventRow key={event.id} placeId={placeId} event={event} scanStats={scanStatsById[event.id]} onDelete={onDelete} />
          ))}
        </ul>
      )}

      {events.length > 0 && active.length === 0 && (
        <p className="text-sm text-gray-500">Aucun événement à venir. Créez-en un nouveau ci-dessus.</p>
      )}

      {past.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900">
            Événements passés ({past.length})
          </summary>
          <ul className="mt-3 flex flex-col gap-3">
            {past.map((event) => (
              <EventRow key={event.id} placeId={placeId} event={event} scanStats={undefined} onDelete={onDelete} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
