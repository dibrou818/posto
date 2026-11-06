"use client";

import type { ReactNode } from "react";
import type { Tag } from "@/lib/queries";
import type { ResultKindFilter } from "@/lib/resultFilter";
import type { TagFilter } from "@/lib/usePlacesExplorer";
import type { EventFilters } from "@/lib/useEventFilters";
import { KindFilter } from "@/components/KindFilter";
import { DateFilter } from "@/components/DateFilter";
import { WhatFilter } from "@/components/WhatFilter";
import { FiltersSheet } from "@/components/FiltersSheet";

/** The filter bar shared by the home page and the map, so a filter learned
 * on one is the same on the other: Lieux / Événements / Tout, then one chip
 * per question — Où (home only, passed as `locationChip`), Quand, Quoi —
 * and a "Filtres" sheet for the rest. Mobile lays the chips out as an even
 * grid, larger screens as one row. */
export function ExploreFilterBar({
  kind,
  onKindChange,
  filters,
  tags,
  selectedTag,
  onSelectTag,
  locationChip,
  resultCount,
}: {
  kind: ResultKindFilter;
  onKindChange: (kind: ResultKindFilter) => void;
  filters: EventFilters;
  tags: Tag[];
  selectedTag: TagFilter | null;
  onSelectTag: (tag: TagFilter | null) => void;
  locationChip?: ReactNode;
  resultCount: number;
}) {
  const showEventFilters = kind !== "place";
  // On a phone the city chip gets its own full row (its label is the longest),
  // so the chips below keep the same shape on every tab: three in a row for
  // events (Quand, Quoi, Filtres), two for places.
  const chipCount = 2 + (showEventFilters ? 1 : 0);
  return (
    <div className={`grid gap-2 sm:flex sm:flex-wrap sm:items-center ${chipCount === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
      <div className="col-span-full sm:contents">
        <KindFilter value={kind} onChange={onKindChange} />
      </div>
      {locationChip && <div className="col-span-full sm:contents">{locationChip}</div>}
      {showEventFilters && <DateFilter value={filters.dateFilter} onChange={filters.setDateFilter} />}
      <WhatFilter tags={tags} value={selectedTag} onChange={onSelectTag} />
      <FiltersSheet filters={filters} showEventFilters={showEventFilters} resultCount={resultCount} />
    </div>
  );
}
