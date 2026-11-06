"use client";

import type { Tag } from "@/lib/queries";
import type { TagFilter } from "@/lib/usePlacesExplorer";
import { FilterChip, FilterChipOption } from "@/components/ui/FilterChip";

function GridIcon() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="5.5" height="5.5" rx="1.2" />
      <rect x="11.5" y="3" width="5.5" height="5.5" rx="1.2" />
      <rect x="3" y="11.5" width="5.5" height="5.5" rx="1.2" />
      <rect x="11.5" y="11.5" width="5.5" height="5.5" rx="1.2" />
    </svg>
  );
}

/** "Quoi ?" — what kind of activity. One choice from the tag catalogue; the
 * search bar's tag suggestions drive the very same state, so picking a tag
 * there shows up on this chip. */
export function WhatFilter({
  tags,
  value,
  onChange,
}: {
  tags: Tag[];
  value: TagFilter | null;
  onChange: (value: TagFilter | null) => void;
}) {
  return (
    <FilterChip
      icon={<GridIcon />}
      label={value ? value.label : "Quoi"}
      onClear={value ? () => onChange(null) : undefined}
      clearLabel="Réinitialiser le filtre d'activité"
      panelClassName="w-60 max-h-80 overflow-y-auto"
    >
      {(close) => (
        <>
          {tags.map((tag) => (
            <FilterChipOption
              key={tag.id}
              label={tag.label}
              selected={value?.id === tag.id}
              onClick={() => {
                onChange(value?.id === tag.id ? null : { id: tag.id, slug: tag.slug, label: tag.label });
                close();
              }}
            />
          ))}
        </>
      )}
    </FilterChip>
  );
}
