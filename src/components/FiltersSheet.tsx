"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { FilterButton } from "@/components/ui/FilterChip";
import { BUDGET_FILTER_OPTIONS } from "@/lib/budgetFilter";
import { DURATION_FILTER_OPTIONS } from "@/lib/exploreFilters";
import { ACCESS_OPTIONS } from "@/lib/access";
import type { EventFilters } from "@/lib/useEventFilters";

function SlidersIcon() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
      <path d="M3 6h8M15 6h2M3 14h2M9 14h8" />
      <circle cx="13" cy="6" r="2" />
      <circle cx="7" cy="14" r="2" />
    </svg>
  );
}

/** One question of the sheet: a title and its options as pills. Tapping the
 * selected option clears it, like the other filters. */
function Choices<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (next: T | null) => void;
}) {
  return (
    <div role="group" aria-label={title} className="border-t border-gray-100 py-4">
      <h3 className="mb-2.5 text-sm font-semibold text-gray-900">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(selected ? null : option.value)}
              className={`min-h-10 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/30 ${
                selected
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The "Filtres" chip and the sheet it opens: everything that isn't a date
 * ("Quand") or an activity ("Quoi") — budget, duration, access, and "open
 * now" — grouped by the question each answers. Events-only sections are
 * hidden while only places are shown. */
export function FiltersSheet({
  filters,
  showEventFilters,
  resultCount,
}: {
  filters: EventFilters;
  showEventFilters: boolean;
  resultCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <FilterButton
        icon={<SlidersIcon />}
        label="Filtres"
        count={filters.moreCount}
        onClick={() => setOpen(true)}
      />
      {open && (
        <Sheet
          title="Filtres"
          onClose={() => setOpen(false)}
          footer={
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={filters.resetMore}
                disabled={filters.moreCount === 0}
                className="min-h-11 rounded-xl px-3 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 disabled:opacity-40"
              >
                Réinitialiser
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-11 flex-1 rounded-xl bg-brand px-5 text-sm font-semibold text-on-accent transition-colors hover:bg-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                {resultCount === 0
                  ? "Aucun résultat"
                  : `Voir ${resultCount} résultat${resultCount > 1 ? "s" : ""}`}
              </button>
            </div>
          }
        >
          <div role="group" aria-label="En ce moment" className="pb-4">
            <h3 className="mb-2.5 text-sm font-semibold text-gray-900">En ce moment</h3>
            <button
              type="button"
              aria-pressed={filters.openNowOnly}
              onClick={() => filters.setOpenNowOnly(!filters.openNowOnly)}
              className={`min-h-10 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/30 ${
                filters.openNowOnly
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              Ouvert maintenant
            </button>
          </div>
          {showEventFilters && (
            <>
              <Choices
                title="Budget"
                options={BUDGET_FILTER_OPTIONS}
                value={filters.budgetFilter}
                onChange={filters.setBudgetFilter}
              />
              <Choices
                title="Durée"
                options={DURATION_FILTER_OPTIONS}
                value={filters.durationFilter}
                onChange={filters.setDurationFilter}
              />
              <Choices
                title="Accès"
                options={ACCESS_OPTIONS}
                value={filters.accessFilter}
                onChange={filters.setAccessFilter}
              />
            </>
          )}
        </Sheet>
      )}
    </>
  );
}
