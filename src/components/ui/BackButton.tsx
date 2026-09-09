"use client";

import { useRouter } from "next/navigation";

/** Small round "←" control for the top-left of a page reached by drilling in
 * (a place, an event, a dashboard sub-page) — lets people retrace their steps
 * without hunting for the main nav. Uses real browser history when there is
 * some (so it lands back exactly where the user came from), and falls back
 * to `fallbackHref` for a page opened directly (e.g. a shared link). */
export function BackButton({
  fallbackHref = "/",
  label = "Retour",
  className = "",
}: {
  fallbackHref?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  function handleClick() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 ${className}`.trim()}
    >
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path d="M12.5 4.5 6 11l6.5 6.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
