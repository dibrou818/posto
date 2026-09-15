// Shared "budget" filter for events — price_cents/price_unit have been
// structured columns since the poster/dashboard price form existed, but
// nothing ever let a visitor filter *by* them, only see one printed on a
// card after already opening it. Events-only: places/activities carry no
// price at all in this schema, so this filter has nothing to act on there.
export type BudgetFilterValue = "free" | "under15" | "15to30" | "30plus";

// under15/15to30/30plus deliberately mirror the same 15€/30€ breakpoints a
// visitor already sees on price pills across the app — not arbitrary
// buckets invented just for this filter.
export const BUDGET_FILTER_OPTIONS: { value: BudgetFilterValue; label: string; shortLabel: string }[] = [
  { value: "free", label: "Gratuit", shortLabel: "Gratuit" },
  { value: "under15", label: "Moins de 15 €", shortLabel: "< 15 €" },
  { value: "15to30", label: "15 € - 30 €", shortLabel: "15-30 €" },
  { value: "30plus", label: "30 € et plus", shortLabel: "30 €+" },
];

/** `cents` null means "prix non précisé" (see formatPrice) — an event with
 * no price data can't honestly be said to fall into any specific bucket, so
 * a budget filter excludes it rather than guessing. `filter` null/undefined
 * means "no budget filter active", matching everything. */
export function matchesBudgetFilter(cents: number | null, filter: BudgetFilterValue | null): boolean {
  if (!filter) return true;
  if (cents === null) return false;
  switch (filter) {
    case "free":
      return cents === 0;
    case "under15":
      return cents > 0 && cents < 1500;
    case "15to30":
      return cents >= 1500 && cents <= 3000;
    case "30plus":
      return cents > 3000;
  }
}
