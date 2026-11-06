import Link from "next/link";
import type { Event } from "@/lib/queries";
import type { QrScanStats } from "@/lib/qrScans";
import { formatEventSchedule, formatRecurrence, formatPrice } from "@/lib/eventSchedule";
import { getEventStatus } from "@/lib/dashboardEventStatus";
import { buttonClass } from "@/lib/ui";
import { PlusIcon } from "@/components/ui/PlusIcon";
import { ChevronRightIcon } from "@/components/ui/icons";

const dayFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric" });
const monthFormat = new Intl.DateTimeFormat("fr-FR", { month: "short" });

function RepeatIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5" aria-hidden="true">
      <path d="M4 9a5 5 0 0 1 8.5-3.5L15 8M16 11a5 5 0 0 1-8.5 3.5L5 12" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 4v4h-4M5 16v-4h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** One event as a single row that opens its page. What's left to do (QR
 * code, poster) is quiet text on the right, not a row of buttons. */
function EventRow({ placeId, event, scanStats }: { placeId: string; event: Event; scanStats: QrScanStats | undefined }) {
  const status = getEventStatus(event);
  const priceLabel = formatPrice(event.price_cents, event.price_unit);
  const start = new Date(event.start_datetime);
  const todo = [!event.qr_code_url && "code QR", !event.poster_url && "affiche"].filter(Boolean);
  const meta = [
    formatEventSchedule(event.start_datetime, event.end_datetime),
    event.recurrence_rule ? formatRecurrence(event.recurrence_rule) : null,
    priceLabel,
  ].filter(Boolean);

  return (
    <li>
      <Link
        href={`/dashboard/places/${placeId}/evenements/${event.id}`}
        className="-mx-3 flex items-center gap-4 rounded-xl px-3 py-3.5 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:bg-gray-50"
      >
        <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-gray-100 text-gray-900">
          {event.recurrence_rule ? (
            <RepeatIcon />
          ) : (
            <>
              <span className="text-base leading-none font-semibold tabular-nums">{dayFormat.format(start)}</span>
              <span className="mt-0.5 text-[11px] leading-none text-gray-500">{monthFormat.format(start).replace(".", "")}</span>
            </>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate font-medium text-gray-900">{event.title}</span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
          </span>
          <span className="mt-0.5 block truncate text-sm text-gray-500 tabular-nums">{meta.join(" · ")}</span>
        </span>
        <span className="hidden shrink-0 text-right text-sm text-gray-500 tabular-nums md:block">
          {todo.length > 0
            ? `À faire : ${todo.join(", ")}`
            : scanStats
              ? `${scanStats.total} scan${scanStats.total > 1 ? "s" : ""}`
              : "Prêt"}
        </span>
        <ChevronRightIcon />
      </Link>
    </li>
  );
}

/** The events of a place: one button to create, then what's coming up as a
 * plain list, and what's over folded away below. Everything you do with an
 * event (edit, QR code, poster, duplicate, delete) lives on its own page. */
export function EventsManager({
  placeId,
  events,
  scanStatsById,
}: {
  placeId: string;
  events: Event[];
  scanStatsById: Record<string, QrScanStats>;
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
    <div className="flex flex-col gap-8">
      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="posto-heading text-lg text-gray-900">
            À venir <span className="font-normal text-gray-500 tabular-nums">{active.length}</span>
          </h2>
          <Link href={`/dashboard/places/${placeId}/evenements/nouveau`} className={buttonClass("compact", "shrink-0 px-4")}>
            <PlusIcon />
            Nouvel événement
          </Link>
        </div>
        {active.length > 0 ? (
          <ul className="divide-y divide-gray-200 border-y border-gray-200">
            {active.map((event) => (
              <EventRow key={event.id} placeId={placeId} event={event} scanStats={scanStatsById[event.id]} />
            ))}
          </ul>
        ) : (
          <p className="border-y border-gray-200 py-8 text-center text-sm text-gray-500">
            Aucun événement à venir. Un quiz, une soirée, un tournoi ? Publiez-le en quelques champs.
          </p>
        )}
      </section>

      {past.length > 0 && (
        <details className="group">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 [&::-webkit-details-marker]:hidden">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90" aria-hidden="true"><path d="m8 5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Passés <span className="tabular-nums text-gray-500">{past.length}</span>
          </summary>
          <ul className="mt-3 divide-y divide-gray-200 border-y border-gray-200">
            {past.map((event) => (
              <EventRow key={event.id} placeId={placeId} event={event} scanStats={undefined} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
