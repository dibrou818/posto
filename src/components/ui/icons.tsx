/** Small line icons shared across screens, so the same glyph is drawn the
 * same way everywhere (one stroke, one size) instead of being redefined in
 * each file. */

export function ChevronRightIcon({ className = "h-4 w-4 text-gray-500" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className={`shrink-0 ${className}`} aria-hidden="true">
      <path d="m8 5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronLeftIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className={`shrink-0 ${className}`} aria-hidden="true">
      <path d="M12 5 7 10l5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
