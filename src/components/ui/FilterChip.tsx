"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

// So the panel isn't clipped off the right edge of the viewport —
// DateFilter's calendar panel is wide enough for this to genuinely happen
// when its chip sits further right in a row (see the flip-to-right-aligned
// logic below); Budget's own narrow option list almost never needs it, but
// every chip built on this shell gets the safety net for free either way.
const VIEWPORT_MARGIN = 8;

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 7.5 10 12.5 15 7.5" />
    </svg>
  );
}

/** The one dropdown-chip shell every filter in this app shares — extracted
 * from what used to be BudgetFilter's own one-off markup, now BudgetFilter
 * (and DateFilter alongside it) are just this shell with their own icon and
 * option list dropped in. That's deliberate, not just a DRY cleanup: a
 * filter built on a *different* component can always drift a pixel or an
 * interaction detail away from the others over time, even with the best
 * intentions — building every filter chip on the literal same component is
 * what actually guarantees a visitor who's learned one filter (say, on the
 * home page) recognizes the exact same thing on the map, and everywhere
 * else a filter shows up next.
 *
 * `children` is a render prop taking `close` — most filters want to shut
 * the dropdown the moment an option is picked (one tap to choose, panel
 * gone), which only the content itself knows when that is. */
export function FilterChip({
  icon,
  label,
  onClear,
  clearLabel,
  panelClassName = "w-48",
  children,
}: {
  icon: ReactNode;
  label: string;
  /** Omit to hide the "✕" reset button entirely (nothing selected yet). */
  onClear?: () => void;
  clearLabel?: string;
  /** Width (and any other layout) class for the dropdown panel — Budget's
   * plain option list fits in the default w-48; a wider panel (DateFilter's
   * calendar) passes its own. */
  panelClassName?: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Left-aligned (under the button's own left edge) by default, same as
  // this shell always was — flipped to right-aligned only when the panel,
  // once actually rendered and measured, would otherwise run past the
  // viewport's right edge. Re-measured fresh every time the panel opens
  // (a chip's position in its row, or the viewport itself, can change
  // between opens), and via useLayoutEffect specifically so the flip (if
  // any) happens before the browser paints — no visible jump from one side
  // to the other.
  const [alignRight, setAlignRight] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useLayoutEffect(() => {
    // The setState calls below are wrapped in a microtask rather than
    // called directly in the effect body — same fix as LocationWeather's
    // own mount effect elsewhere in this app — since a synchronous setState
    // here would itself resynchronously re-run every other effect on this
    // commit. A microtask still drains before the browser's next paint
    // (unlike, say, a setTimeout), so this keeps the actual point of using
    // useLayoutEffect — no visible flash from one side to the other.
    if (!open) {
      queueMicrotask(() => setAlignRight(false));
      return;
    }
    const panel = panelRef.current;
    if (!panel) return;
    const overflowsRight = panel.getBoundingClientRect().right > window.innerWidth - VIEWPORT_MARGIN;
    queueMicrotask(() => setAlignRight(overflowsRight));
  }, [open]);

  return (
    <div ref={containerRef} className="relative min-w-0">
      {/* Same padded-pill shell every chip in a filter row shares, so they
          all agree on height/border regardless of which one this is.
          min-w-0 on the outer div, flex-1 on the trigger button: when a
          caller stretches this chip to fill a wider slot (the mobile grid
          row — see HomeExplorer.tsx/FullScreenMap.tsx), the button grows to
          actually fill it instead of leaving dead space next to a
          content-sized button in an otherwise-wide box; on desktop, where
          the row never forces a chip wider than its own content, flex-1
          has nothing to grow into and this renders exactly as before. */}
      <div className="flex min-w-0 items-center gap-1 rounded-lg border border-gray-300 bg-white p-1 text-xs">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center justify-between gap-1.5 rounded-md px-2.5 py-1.5 font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {icon}
            <span className="min-w-0 truncate">{label}</span>
          </span>
          <ChevronIcon />
        </button>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label={clearLabel}
            title="Réinitialiser"
            className="shrink-0 rounded-full p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <div
          ref={panelRef}
          className={`absolute top-full z-50 mt-1 ${alignRight ? "right-0" : "left-0"} ${panelClassName} rounded-lg border border-gray-200 bg-white p-1.5 shadow-lg`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

/** One option row inside a FilterChip's plain-list panel (Budget's own
 * shape, and DateFilter's quick-option list) — same selected/idle styling
 * either filter would otherwise have to repeat. */
export function FilterChipOption({
  label,
  selected,
  onClick,
}: {
  label: ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full rounded-md px-3 py-1.5 text-left text-sm font-medium transition-colors focus:outline-none focus-visible:bg-gray-50 ${
        selected ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}
