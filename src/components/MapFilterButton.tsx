"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { RESULT_KIND_OPTIONS, type ResultKindFilter } from "@/lib/resultFilter";
import { EVENT_DATE_QUICK_OPTIONS, ALL_EVENT_DATES, type EventDateFilterValue } from "@/lib/eventDateFilter";
import { useIsMobileViewport } from "@/lib/viewport";

// Keeps a sliver of map visible on both sides on mobile — "quasiment toute
// la largeur", not literally edge-to-edge — and matches the top overlay
// bar's own p-3 padding in FullScreenMap for visual consistency.
const MOBILE_VIEWPORT_MARGIN = 12;

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M8 12h8M11 18h2" />
    </svg>
  );
}

// "2026-09-12" (the <input type="date"> value, always local) -> "12 sept."
// — parsed by hand rather than `new Date("2026-09-12")`, which the spec
// treats as UTC midnight and can display as the *previous* day in any
// timezone behind UTC.
const dateChipFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
function formatChosenDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return dateChipFormatter.format(new Date(year, month - 1, day));
}

/** The map's one filter entry point, at the right end of the search bar —
 * "quoi" (Lieux/Événements/Tout) and, when events are in play, "quand"
 * (Aujourd'hui/Ce week-end/Cette semaine, or one exact date) live in the
 * same panel instead of a permanent row of pills, so the map itself isn't
 * permanently cluttered by a choice most visits never touch. */
export function MapFilterButton({
  kindFilter,
  onKindFilterChange,
  dateFilter,
  onDateFilterChange,
  open: controlledOpen,
  onOpenChange,
}: {
  kindFilter: ResultKindFilter;
  onKindFilterChange: (value: ResultKindFilter) => void;
  dateFilter: EventDateFilterValue;
  onDateFilterChange: (value: EventDateFilterValue) => void;
  /** Lets a parent close this panel from outside — FullScreenMap uses it to
   * close the panel the moment the map itself starts moving, which this
   * component's own click-outside listener can't catch (the drag starts and
   * ends on the map canvas, not on a click). Same controlled/uncontrolled
   * split as SearchBar's own `filter` prop; omit both to keep this fully
   * self-contained. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  function setOpen(next: boolean | ((prev: boolean) => boolean)) {
    const resolved = typeof next === "function" ? next(open) : next;
    if (onOpenChange) onOpenChange(resolved);
    else setInternalOpen(resolved);
  }
  const [showDatePicker, setShowDatePicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobileViewport();
  // Measured (not a static CSS class) because it needs to be a `fixed`
  // panel centered in the *viewport* on mobile, not just anchored under the
  // button the way the desktop corner popup is — the button sits at the
  // right end of the top bar, so a plain "center under me" would center on
  // the button's own position, not the screen.
  const [mobilePos, setMobilePos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (!open || !isMobile) return;
    function reposition() {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setMobilePos({
        top: rect.bottom + 8,
        left: MOBILE_VIEWPORT_MARGIN,
        width: window.innerWidth - MOBILE_VIEWPORT_MARGIN * 2,
      });
    }
    reposition();
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
  }, [open, isMobile]);

  // "place" hides every event marker on the map — a "when" choice would
  // have nothing left to act on, so the section itself doesn't show.
  const showDateSection = kindFilter !== "place";
  const isFiltered = kindFilter !== "all" || dateFilter.kind !== "all";

  function selectQuickDate(kind: "today" | "weekend" | "week") {
    // Tapping the already-active chip clears it back to "all dates" — the
    // one way to undo a quick pick without hunting for a separate reset.
    onDateFilterChange(dateFilter.kind === kind ? ALL_EVENT_DATES : { kind });
    setShowDatePicker(false);
  }

  function clearDate() {
    onDateFilterChange(ALL_EVENT_DATES);
    setShowDatePicker(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Filtrer"
        aria-expanded={open}
        className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 ${
          open ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        <FilterIcon />
        {isFiltered && !open && (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-violet-600" />
        )}
      </button>

      {open && (
        // Two entirely different placements below the `md` breakpoint
        // (tablet/desktop keep the small corner popup, unchanged): on
        // mobile this becomes a `fixed`, viewport-centered panel — nearly
        // the full screen width (MOBILE_VIEWPORT_MARGIN on each side, so a
        // sliver of map stays visible) rather than a cramped 288px box
        // anchored under a button pinned to the right edge of the screen.
        // `fixed` + measured position (mobilePos, see the layout effect
        // above) rather than a `md:`-prefixed Tailwind class: centering in
        // the viewport can't be expressed relative to this panel's own
        // `absolute` anchor (the button's own small container), the same
        // reasoning as LocationFilter's own dropdown positioning.
        //
        // max-h clamps to the viewport (minus a small margin), with its own
        // scroll once content would exceed that — the map view locks all
        // page scroll (see useLockBodyScroll), so without this, a panel tall
        // enough to reach past the bottom of a short viewport would have no
        // way to be scrolled into view at all, not just look cramped.
        // z-50: above this app's persistent chrome (BottomNav is z-30),
        // not just above ordinary page content — see QrCodeSection's
        // tooltip for the full reasoning.
        <div
          className={
            isMobile
              ? "fixed z-50 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-3 shadow-lg"
              : "absolute top-full right-0 z-50 mt-2 max-h-[calc(100dvh-6rem)] w-72 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-3 shadow-lg"
          }
          style={isMobile && mobilePos ? { top: mobilePos.top, left: mobilePos.left, width: mobilePos.width } : undefined}
        >
          <p className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">Quoi</p>
          <div className="flex gap-1.5">
            {RESULT_KIND_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onKindFilterChange(option.value)}
                aria-pressed={kindFilter === option.value}
                className={`flex-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 ${
                  kindFilter === option.value ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {showDateSection && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="mb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">Quand</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {EVENT_DATE_QUICK_OPTIONS.map((option) => (
                  <button
                    key={option.kind}
                    type="button"
                    onClick={() => selectQuickDate(option.kind)}
                    aria-pressed={dateFilter.kind === option.kind}
                    className={`shrink-0 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 ${
                      dateFilter.kind === option.kind ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
                <span className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowDatePicker((v) => !v)}
                    aria-pressed={dateFilter.kind === "date"}
                    className={`rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 ${
                      dateFilter.kind === "date" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {dateFilter.kind === "date" ? formatChosenDate(dateFilter.date) : "Date précise"}
                  </button>
                  {dateFilter.kind === "date" && (
                    <button
                      type="button"
                      onClick={clearDate}
                      aria-label="Effacer la date choisie"
                      className="text-gray-400 transition-colors hover:text-gray-700"
                    >
                      ✕
                    </button>
                  )}
                </span>
              </div>
              {showDatePicker && (
                <input
                  type="date"
                  autoFocus
                  defaultValue={dateFilter.kind === "date" ? dateFilter.date : ""}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    onDateFilterChange({ kind: "date", date: e.target.value });
                    setShowDatePicker(false);
                  }}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
