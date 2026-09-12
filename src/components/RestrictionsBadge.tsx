function WarningIcon() {
  return (
    <svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2 18 16H2L10 2Z" />
      <path d="M10 8v3.5" />
      <circle cx="10" cy="14" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Small amber pill for an activity/event's access conditions — "+18 ans",
 * "1m45 minimum", "Certificat Open Water niveau 1 obligatoire", etc. Free
 * text (restrictions vary too much to force into a fixed shape), but always
 * shown with the same warning styling so it reads as a condition to check
 * before showing up, not just another descriptive detail. */
export function RestrictionsBadge({ text }: { text: string | null }) {
  if (!text) return null;

  return (
    <span className="inline-flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
      <span className="mt-0.5 shrink-0">
        <WarningIcon />
      </span>
      {text}
    </span>
  );
}
