import { formatOpenStatus, type OpenStatus } from "@/lib/opening-hours";

function describe(status: OpenStatus): { label: string; tone: "open" | "soon" | "closed" } {
  const short = formatOpenStatus(status);
  if (status.open) {
    return short === "Ouvert"
      ? { label: "Ouvert maintenant", tone: "open" }
      : { label: `Ouvert · ${short.charAt(0).toLowerCase()}${short.slice(1)}`, tone: "soon" };
  }
  return short === "Fermé"
    ? { label: "Fermé", tone: "closed" }
    : { label: `Fermé · ${short.charAt(0).toLowerCase()}${short.slice(1)}`, tone: "soon" };
}

const TONES = {
  open: { box: "bg-green-50 text-green-800", dot: "bg-green-500" },
  soon: { box: "bg-amber-50 text-amber-900", dot: "bg-amber-500" },
  closed: { box: "bg-red-50 text-red-800", dot: "bg-red-500" },
} as const;

/** The place's live open/closed state, deliberately the loudest thing under
 * the title: a visitor deciding whether to go now needs this before
 * anything else. Amber while a change is imminent ("ferme dans 20 min"). */
export function OpenStatusBadge({ status }: { status: OpenStatus }) {
  const { label, tone } = describe(status);
  const t = TONES[tone];
  return (
    <p className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold ${t.box}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${t.dot}`} aria-hidden="true" />
      {label}
    </p>
  );
}
