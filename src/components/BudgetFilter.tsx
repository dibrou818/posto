"use client";

import { useEffect, useRef, useState } from "react";
import { BUDGET_FILTER_OPTIONS, type BudgetFilterValue } from "@/lib/budgetFilter";

function EuroIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 6.5a6 6 0 1 0 0 11" />
      <path d="M4.5 10h9M4.5 14h7.5" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 7.5 10 12.5 15 7.5" />
    </svg>
  );
}

/** Budget chip next to KindFilter/LocationFilter: price_cents/price_unit
 * were already structured data (see formatPrice), just never exposed as
 * anything a visitor could filter *by* — only ever printed on a card after
 * they'd already opened it. Events-only (see budgetFilter.ts); HomeExplorer
 * only renders this while events are actually in view. */
export function BudgetFilter({
  value,
  onChange,
}: {
  value: BudgetFilterValue | null;
  onChange: (value: BudgetFilterValue | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const selected = BUDGET_FILTER_OPTIONS.find((o) => o.value === value) ?? null;

  function pick(next: BudgetFilterValue) {
    // Tapping the already-active option clears it, same reflex as
    // MapFilterButton's quick date chips — one tap to set, one more to undo,
    // no separate reset control needed for the common case.
    onChange(value === next ? null : next);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative min-w-0">
      {/* Same padded-pill shell as LocationFilter right next to this, so
          every chip in this row shares one height/border language. */}
      <div className="flex min-w-0 items-center gap-1 rounded-lg border border-gray-300 bg-white p-1 text-xs">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
        >
          <EuroIcon />
          <span className="min-w-0 max-w-[7rem] truncate sm:max-w-[9rem]">
            {selected ? selected.shortLabel : "Budget"}
          </span>
          <ChevronIcon />
        </button>
        {selected && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Réinitialiser le filtre de budget"
            title="Réinitialiser"
            className="shrink-0 rounded-full p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-48 rounded-lg border border-gray-200 bg-white p-1.5 shadow-lg">
          {BUDGET_FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => pick(option.value)}
              aria-pressed={value === option.value}
              className={`w-full rounded-md px-3 py-1.5 text-left text-sm font-medium transition-colors focus:outline-none focus-visible:bg-gray-50 ${
                value === option.value ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
