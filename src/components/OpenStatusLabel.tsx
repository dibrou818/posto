import { formatOpenStatus, openStatusTone, type OpenStatus, type OpenStatusTone } from "@/lib/opening-hours";

/** Posto's signature: a place's live state, drawn the same way everywhere
 * it appears (cards, place page, pro dashboard) — a dot and a short label
 * with tabular figures, so "Ferme dans 43 min" never jitters. */
export const STATUS_DOT: Record<OpenStatusTone, string> = {
  open: "bg-green-500",
  soon: "bg-amber-500",
  closed: "bg-red-500",
  unknown: "bg-gray-400",
};

export const STATUS_TEXT: Record<OpenStatusTone, string> = {
  open: "text-green-700",
  soon: "text-amber-700",
  closed: "text-red-600",
  unknown: "text-gray-500",
};

export function OpenStatusLabel({
  status,
  hasHours = true,
  label,
  className = "",
}: {
  status: OpenStatus;
  hasHours?: boolean;
  /** Overrides the default short label ("Ouvert", "Ferme dans 20 min"…). */
  label?: string;
  className?: string;
}) {
  const tone = openStatusTone(status, hasHours);
  const text = label ?? (hasHours ? formatOpenStatus(status) : "Horaires non renseignés");
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 font-medium tabular-nums ${STATUS_TEXT[tone]} ${className}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[tone]}`} aria-hidden="true" />
      <span className="truncate">{text}</span>
    </span>
  );
}
