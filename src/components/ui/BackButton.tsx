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
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/50 bg-white/92 text-gray-900 shadow-lg backdrop-blur-md transition-transform hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50 ${className}`.trim()}
    >
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
        <path d="M12.5 4.5 6 11l6.5 6.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
