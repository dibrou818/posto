import { formatRecurrence } from "@/lib/eventSchedule";

function RepeatIcon() {
  return (
    <svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 7h8a2 2 0 0 1 2 2v1" strokeLinecap="round" />
      <path d="M7.5 4.5 5 7l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 13H7a2 2 0 0 1-2-2v-1" strokeLinecap="round" />
      <path d="M12.5 15.5 15 13l-2.5-2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Small pill for a recurring event's schedule — icon + human text ("Tous
 * les jeudis") instead of the raw stored rule ("weekly:thursday"). Renders
 * nothing for a one-off event. */
export function RecurrenceBadge({ rule }: { rule: string | null }) {
  const label = formatRecurrence(rule);
  if (!label) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
      <RepeatIcon />
      {label}
    </span>
  );
}
