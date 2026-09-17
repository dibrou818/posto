"use client";

import { BUDGET_FILTER_OPTIONS, type BudgetFilterValue } from "@/lib/budgetFilter";
import { FilterChip, FilterChipOption } from "@/components/ui/FilterChip";

function EuroIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 6.5a6 6 0 1 0 0 11" />
      <path d="M4.5 10h9M4.5 14h7.5" />
    </svg>
  );
}

/** Budget chip next to KindFilter/LocationFilter (and, on the map, the same
 * chip again next to DateFilter — see FullScreenMap.tsx): price_cents/
 * price_unit were already structured data (see formatPrice), just never
 * exposed as anything a visitor could filter *by* — only ever printed on a
 * card after they'd already opened it. Events-only (see budgetFilter.ts);
 * both callers only render this while events are actually in view.
 *
 * A thin wrapper around the shared FilterChip shell (see ui/FilterChip.tsx)
 * — this file used to own that shell's markup directly, which is exactly
 * the setup that let the map grow its own, visually different filter UI
 * over time. */
export function BudgetFilter({
  value,
  onChange,
}: {
  value: BudgetFilterValue | null;
  onChange: (value: BudgetFilterValue | null) => void;
}) {
  const selected = BUDGET_FILTER_OPTIONS.find((o) => o.value === value) ?? null;

  function pick(next: BudgetFilterValue, close: () => void) {
    // Tapping the already-active option clears it — one tap to set, one
    // more to undo, no separate reset control needed for the common case.
    onChange(value === next ? null : next);
    close();
  }

  return (
    <FilterChip
      icon={<EuroIcon />}
      label={selected ? selected.shortLabel : "Budget"}
      onClear={selected ? () => onChange(null) : undefined}
      clearLabel="Réinitialiser le filtre de budget"
    >
      {(close) => (
        <>
          {BUDGET_FILTER_OPTIONS.map((option) => (
            <FilterChipOption
              key={option.value}
              label={option.label}
              selected={value === option.value}
              onClick={() => pick(option.value, close)}
            />
          ))}
        </>
      )}
    </FilterChip>
  );
}
