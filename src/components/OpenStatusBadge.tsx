import { formatOpenStatus, openStatusTone, type OpenStatus } from "@/lib/opening-hours";
import { STATUS_DOT } from "@/components/OpenStatusLabel";

function describe(status: OpenStatus): string {
  const short = formatOpenStatus(status);
  const lower = `${short.charAt(0).toLowerCase()}${short.slice(1)}`;
  if (status.open) return short === "Ouvert" ? "Ouvert maintenant" : `Ouvert · ${lower}`;
  return short === "Fermé" ? "Fermé" : `Fermé · ${lower}`;
}

const BOX = {
  open: "bg-green-50 text-green-800",
  soon: "bg-amber-50 text-amber-900",
  closed: "bg-red-50 text-red-800",
  unknown: "bg-gray-100 text-gray-700",
} as const;

/** The place's live open/closed state, deliberately the loudest thing under
 * the title: a visitor deciding whether to go now needs this before
 * anything else. Same dot and tones as OpenStatusLabel, on a tinted box. */
export function OpenStatusBadge({ status }: { status: OpenStatus }) {
  const tone = openStatusTone(status);
  return (
    <p className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium tabular-nums ${BOX[tone]}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[tone]}`} aria-hidden="true" />
      {describe(status)}
    </p>
  );
}
