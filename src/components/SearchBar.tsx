"use client";

import { useEffect, useRef, useState } from "react";
import { matchesResultKind, RESULT_KIND_OPTIONS, type ResultKindFilter } from "@/lib/resultFilter";

export type SearchResult = {
  result_type: "place" | "activity" | "event";
  id: string;
  place_id: string;
  title: string;
  subtitle: string | null;
  lat: number;
  lng: number;
  similarity: number;
};

export type TagResult = {
  id: string;
  slug: string;
  label: string;
  similarity: number;
};

export type CityResult = {
  label: string;
  subtitle: string | null;
  lat: number;
  lng: number;
};

interface Props {
  onSelectTag: (tag: TagResult) => void;
  onSelectResult: (result: SearchResult) => void;
  onSelectCity: (city: CityResult) => void;
  placeholder?: string;
  /** Controls the Lieux/Événements filter from outside (e.g. a persistent
   * button next to the search bar) instead of the internal pills row below.
   * Omit both to keep the bar fully self-contained (used on /map). */
  filter?: ResultKindFilter;
  onFilterChange?: (filter: ResultKindFilter) => void;
}

// Small, minimal icons so a result's kind is obvious at a glance without
// needing a category label: a tag for filters, a pin for a specific venue,
// a calendar for a dated event, a target for a city/area.
function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.5 3H5a2 2 0 0 0-2 2v7.5a1 1 0 0 0 .3.7l9 9a1 1 0 0 0 1.4 0l7.5-7.5a1 1 0 0 0 0-1.4l-9-9a1 1 0 0 0-.7-.3Z" />
      <circle cx="8" cy="8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-6.5-7-11.5a7 7 0 0 1 14 0C19 14.5 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.2" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </svg>
  );
}

function CityIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

type Row =
  | { kind: "city"; key: string; title: string; subtitle: string | null; city: CityResult }
  | { kind: "tag"; key: string; title: string; subtitle: string | null; tag: TagResult }
  | {
      kind: "place" | "activity" | "event";
      key: string;
      title: string;
      subtitle: string | null;
      result: SearchResult;
    };

function RowIcon({ kind }: { kind: Row["kind"] }) {
  if (kind === "tag") return <TagIcon />;
  if (kind === "event") return <CalendarIcon />;
  if (kind === "city") return <CityIcon />;
  return <PinIcon />; // place & activity: both anchored to a specific venue
}

export function SearchBar({
  onSelectTag,
  onSelectResult,
  onSelectCity,
  placeholder = "Rechercher un lieu, une activité, un tag...",
  filter: controlledFilter,
  onFilterChange,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<TagResult[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [cities, setCities] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [internalFilter, setInternalFilter] = useState<ResultKindFilter>("all");
  const containerRef = useRef<HTMLDivElement>(null);

  // Externally controlled (a KindFilter button sits next to the bar) when
  // `filter` is passed; otherwise the dropdown manages its own pills row.
  const isControlled = controlledFilter !== undefined;
  const filter = controlledFilter ?? internalFilter;
  function setFilter(next: ResultKindFilter) {
    if (onFilterChange) onFilterChange(next);
    else setInternalFilter(next);
  }

  const queryTooShort = query.trim().length < 2;

  useEffect(() => {
    if (queryTooShort) return;

    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setTags(data.tags ?? []);
        setResults(data.results ?? []);
        setCities(data.cities ?? []);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [query, queryTooShort]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Stale results from a previous longer query shouldn't show once the
  // query is cleared back down, so gate on length instead of clearing state.
  const rows: Row[] = queryTooShort
    ? []
    : [
        ...cities.map((city): Row => ({
          kind: "city",
          key: `city-${city.label}-${city.lat}`,
          title: city.label,
          subtitle: city.subtitle,
          city,
        })),
        ...tags.map((tag): Row => ({
          kind: "tag",
          key: `tag-${tag.id}`,
          title: tag.label,
          subtitle: null,
          tag,
        })),
        ...results
          .filter((result) => matchesResultKind(result.result_type, filter))
          .map((result): Row => ({
            kind: result.result_type,
            key: `${result.result_type}-${result.id}`,
            title: result.title,
            subtitle: result.subtitle,
            result,
          })),
      ];

  function selectRow(row: Row) {
    setOpen(false);
    setQuery("");
    if (row.kind === "city") onSelectCity(row.city);
    else if (row.kind === "tag") onSelectTag(row.tag);
    else onSelectResult(row.result);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.trim().length >= 2 && setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 transition-colors focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
      />
      {open && (loading || rows.length > 0 || query.trim().length >= 2) && (
        <div className="absolute z-20 mt-1 max-h-96 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          <div hidden={isControlled} className="flex gap-1.5 border-b border-gray-100 px-3 py-2">
            {RESULT_KIND_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 ${
                  filter === option.value
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {loading && <div className="px-4 py-3 text-sm text-gray-500">Recherche...</div>}

          {!loading && rows.length > 0 && (
            <div className="py-1">
              {rows.map((row) => (
                <button
                  key={row.key}
                  onClick={() => selectRow(row)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors hover:bg-gray-50"
                >
                  <span className="shrink-0 text-gray-500">
                    <RowIcon kind={row.kind} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-gray-900">{row.title}</span>
                    {row.subtitle && (
                      <span className="block truncate text-xs text-gray-500">{row.subtitle}</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}

          {!loading && rows.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500">Aucun résultat</div>
          )}
        </div>
      )}
    </div>
  );
}
