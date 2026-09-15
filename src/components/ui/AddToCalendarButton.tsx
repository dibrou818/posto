"use client";

import { useEffect, useRef, useState } from "react";
import {
  CALENDAR_PROVIDERS,
  ICS_FALLBACK_PROVIDER,
  icsFilename,
  type CalendarEventInput,
  type CalendarProviderId,
} from "@/lib/calendar";
import { useIsMobileViewport } from "@/lib/viewport";

function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
      <rect x="3.5" y="4.5" width="13" height="12" rx="1.5" />
      <path d="M3.5 8.5h13" strokeLinecap="round" />
      <path d="M7 3v3M13 3v3" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0 text-gray-400">
      <path d="M7.5 4.5 13 10l-5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// A soft brand-tinted chip, not an actual Google/Apple/Microsoft logo —
// reusing real trademarks here would need their brand guidelines'
// permission, which a "clean, minimal, very Posto" picker doesn't need:
// the label text already says which provider it is unambiguously.
const PROVIDER_ACCENT: Record<CalendarProviderId, string> = {
  google: "bg-blue-50 text-blue-600",
  apple: "bg-gray-100 text-gray-700",
  outlook: "bg-sky-50 text-sky-700",
  ics: "bg-gray-100 text-gray-500",
};

function ProviderIcon({ id }: { id: CalendarProviderId }) {
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${PROVIDER_ACCENT[id]}`}>
      <CalendarIcon />
    </span>
  );
}

/** One row in the picker. `external` decides both how the link opens (new
 * tab for Google/Outlook's own site vs. same-tab for the .ics route,
 * matching CalendarProviderDef.opensExternalSite) and whether `download`
 * is set — a hint for the .ics route, redundant with its own
 * Content-Disposition header but harmless, and meaningless (browsers
 * ignore it) for a cross-origin Google/Outlook link. */
function ProviderRow({
  id,
  label,
  href,
  external,
  filename,
  onSelect,
  autoFocusRef,
}: {
  id: CalendarProviderId;
  label: string;
  href: string;
  external: boolean;
  filename: string;
  onSelect: () => void;
  autoFocusRef?: React.RefObject<HTMLAnchorElement | null>;
}) {
  return (
    <a
      ref={autoFocusRef}
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      download={external ? undefined : filename}
      onClick={onSelect}
      className="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
    >
      <ProviderIcon id={id} />
      <span className="flex-1">{label}</span>
      <ArrowIcon />
    </a>
  );
}

/** Replaces the old plain "Ajouter à mon calendrier" download link with a
 * provider picker: the button itself stays neutral (never "Ajouter à
 * Google Calendar") since it opens a choice, not one specific calendar.
 * Google/Outlook get real provider links (their own documented "quick
 * add"/"deeplink compose" URLs — no API, no OAuth, Posto never touches the
 * user's actual calendar); Apple Calendar and the universal fallback both
 * point at the event's own /calendar.ics route (see that route for why a
 * served file beats a data: URI here). Mobile: a bottom sheet. Desktop: a
 * small popover anchored under the button — never a full-screen modal. */
export function AddToCalendarButton({ event }: { event: CalendarEventInput }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLAnchorElement>(null);
  const wasOpenRef = useRef(false);
  const isMobile = useIsMobileViewport();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Moves focus into the panel on open, and back to the trigger button on
  // close (but only on an actual open->close transition, not on the
  // component's own first render where `open` starts false) — a keyboard
  // user shouldn't lose their place on the page once the panel closes.
  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      firstItemRef.current?.focus();
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      triggerRef.current?.focus();
    }
  }, [open]);

  const filename = icsFilename(event.title);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
      >
        <CalendarIcon />
        Ajouter au calendrier
      </button>

      {open && (
        <>
          {isMobile && (
            <div
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
          )}
          <div
            role="dialog"
            aria-modal={isMobile}
            aria-label="Ajouter à mon calendrier"
            className={
              isMobile
                ? "fixed inset-x-0 bottom-0 z-50 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-t-2xl border-t border-gray-200 bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-lg"
                : "absolute top-full left-0 z-50 mt-2 w-72 max-w-[calc(100vw-1.5rem)] max-h-[min(24rem,calc(100dvh-6rem))] overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-lg"
            }
          >
            {isMobile && (
              <div className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-gray-300" aria-hidden="true" />
            )}
            <div className={isMobile ? "mb-2 px-1" : "px-2 pt-1 pb-2"}>
              <p className="text-sm font-semibold text-gray-900">Ajouter à mon calendrier</p>
              <p className="text-xs text-gray-500">Choisissez votre calendrier</p>
            </div>

            <div className="flex flex-col">
              {CALENDAR_PROVIDERS.map((provider, i) => (
                <ProviderRow
                  key={provider.id}
                  id={provider.id}
                  label={provider.label}
                  href={provider.getHref(event)}
                  external={provider.opensExternalSite}
                  filename={filename}
                  onSelect={() => setOpen(false)}
                  autoFocusRef={i === 0 ? firstItemRef : undefined}
                />
              ))}
            </div>

            <div className="my-1 border-t border-gray-100" />

            <ProviderRow
              id={ICS_FALLBACK_PROVIDER.id}
              label={ICS_FALLBACK_PROVIDER.label}
              href={ICS_FALLBACK_PROVIDER.getHref(event)}
              external={ICS_FALLBACK_PROVIDER.opensExternalSite}
              filename={filename}
              onSelect={() => setOpen(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}
