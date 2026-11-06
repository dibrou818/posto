import { isAccessValue, type AccessValue } from "@/lib/access";

// Filters added on top of the date/budget ones (see eventDateFilter.ts,
// budgetFilter.ts): how long it lasts and how you get in. Events-only, like
// those two — an event with no value for the field can't honestly be said
// to match, so an active filter leaves it out (same rule as budgetFilter).

export type DurationFilterValue = "short" | "medium" | "long";

export const DURATION_FILTER_OPTIONS: { value: DurationFilterValue; label: string; shortLabel: string }[] = [
  { value: "short", label: "Jusqu'à 1 h", shortLabel: "≤ 1 h" },
  { value: "medium", label: "1 à 2 h", shortLabel: "1-2 h" },
  { value: "long", label: "Plus de 2 h", shortLabel: "2 h+" },
];

export function matchesDurationFilter(minutes: number | null, filter: DurationFilterValue | null): boolean {
  if (!filter) return true;
  if (!minutes || minutes <= 0) return false;
  switch (filter) {
    case "short":
      return minutes <= 60;
    case "medium":
      return minutes > 60 && minutes <= 120;
    case "long":
      return minutes > 120;
  }
}

export function matchesAccessFilter(access: string | null, filter: AccessValue | null): boolean {
  if (!filter) return true;
  return isAccessValue(access) && access === filter;
}
