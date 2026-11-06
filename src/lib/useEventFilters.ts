"use client";

import { useCallback, useState } from "react";
import type { EventWithPlace } from "@/lib/queries";
import type { AccessValue } from "@/lib/access";
import { matchesBudgetFilter, type BudgetFilterValue } from "@/lib/budgetFilter";
import { matchesEventDateFilter, ALL_EVENT_DATES, type EventDateFilterValue } from "@/lib/eventDateFilter";
import { matchesAccessFilter, matchesDurationFilter, type DurationFilterValue } from "@/lib/exploreFilters";
import { isEventHappeningNow } from "@/lib/eventSchedule";

/** All the hard filters of the explore screens (home and map) in one place,
 * so both apply exactly the same rules and the shared filter bar can read
 * and write the same state. "Hard" as in HomeExplorer's own comments: an
 * event that doesn't match is dropped, never replaced by a fallback.
 *
 * `moreCount` is what the "Filtres" chip counts — everything except the
 * date, which has its own "Quand" chip. */
export function useEventFilters() {
  const [dateFilter, setDateFilter] = useState<EventDateFilterValue>(ALL_EVENT_DATES);
  const [budgetFilter, setBudgetFilter] = useState<BudgetFilterValue | null>(null);
  const [durationFilter, setDurationFilter] = useState<DurationFilterValue | null>(null);
  const [accessFilter, setAccessFilter] = useState<AccessValue | null>(null);
  const [openNowOnly, setOpenNowOnly] = useState(false);

  const matchesEvent = useCallback(
    (event: EventWithPlace) => {
      if (openNowOnly && !isEventHappeningNow(event.start_datetime, event.end_datetime, event.duration_minutes)) {
        return false;
      }
      if (dateFilter.kind !== "all" && !matchesEventDateFilter(event.start_datetime, dateFilter)) return false;
      return (
        matchesBudgetFilter(event.price_cents, budgetFilter) &&
        matchesDurationFilter(event.duration_minutes, durationFilter) &&
        matchesAccessFilter(event.access, accessFilter)
      );
    },
    [openNowOnly, dateFilter, budgetFilter, durationFilter, accessFilter],
  );

  const moreCount = [budgetFilter, durationFilter, accessFilter, openNowOnly].filter(Boolean).length;
  const activeCount = moreCount + (dateFilter.kind !== "all" ? 1 : 0);

  const resetMore = useCallback(() => {
    setBudgetFilter(null);
    setDurationFilter(null);
    setAccessFilter(null);
    setOpenNowOnly(false);
  }, []);

  return {
    dateFilter,
    setDateFilter,
    budgetFilter,
    setBudgetFilter,
    durationFilter,
    setDurationFilter,
    accessFilter,
    setAccessFilter,
    openNowOnly,
    setOpenNowOnly,
    matchesEvent,
    moreCount,
    activeCount,
    resetMore,
  };
}

export type EventFilters = ReturnType<typeof useEventFilters>;
