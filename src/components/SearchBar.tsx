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
  /** How close to fly in when picked — cities want a wide view of the whole
   * town, a street address wants to land right on it. Omitted for cities;
   * FullScreenMap falls back to its own city zoom. Set by api/search's
   * address bucket, which shares this same shape. */
  zoom?: number;
};

interface Props {
  onSelectTag: (tag: TagResult) => void;
  onSelectResult: (result: SearchResult) => void;
  onSelectCity: (city: CityResult) => void;
  placeholder?: string;
  /** Controls the Lieux/Événements filter from outside (e.g. a persistent
   * button next to the search bar) instead of the internal pills row below.
   * Omit both to keep the bar fully self-contained. */
  filter?: ResultKindFilter;
  onFilterChange?: (filter: ResultKindFilter) => void;
  /** Overrides the input's own rounding — e.g. a fully round pill on the
   * map, where it sits directly next to an equally round filter button.
   * Defaults to the same moderate rounding used everywhere else. */
  inputRoundingClassName?: string;
  /** Whether to search/show cities and street addresses (via Nominatim)
   * alongside places/activities/events/tags. Defaults to true for the map's
   * own search bar, which needs them (picking one flies the map there).
   * The home page has no map to jump to, so a raw address there is a dead
   * end — HomeExplorer passes false to keep results scoped to what it can
   * actually do something with. */
  includeLocationResults?: boolean;
  /** The searcher's own position, when known — passed straight through to
   * search_all as user_lat/user_lng so nearby results outrank equally-good
   * text matches farther away. Optional and silently a no-op when omitted
   * (denied geolocation, no city picked yet): the ranking just falls back
   * to text similarity alone, same as before this existed. */
  userLocation?: { lat: number; lng: number } | null;
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

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.7-4.7" />
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
  // Separate "city"/"address" variants (not one variant with a two-value
  // kind) — TypeScript only narrows a discriminated union cleanly when each
  // variant's own discriminant is a single literal.
  | { kind: "city"; key: string; title: string; subtitle: string | null; city: CityResult }
  | { kind: "address"; key: string; title: string; subtitle: string | null; city: CityResult }
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
  return <PinIcon />; // place, activity & address: all anchored to a specific point
}

export function SearchBar({
  onSelectTag,
  onSelectResult,
  onSelectCity,
  placeholder = "Rechercher un lieu, une activité, un tag...",
  filter: controlledFilter,
  onFilterChange,
  inputRoundingClassName = "rounded-lg",
  includeLocationResults = true,
  userLocation,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<TagResult[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [cities, setCities] = useState<CityResult[]>([]);
  const [addresses, setAddresses] = useState<CityResult[]>([]);
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

    // Aborts the in-flight fetch (not just the pending debounce timer) as
    // soon as a newer query supersedes this one. Without this, two requests
    // can end up in flight together — e.g. edit a character then retype the
    // same address fast enough — and Nominatim's response time varies
    // enough that the *older*, narrower query (which often resolves to zero
    // address matches, since a partial address rarely has a `road` Nominatim
    // can match) can arrive after the newer one and silently overwrite its
    // correct, non-empty results with an empty state.
    const controller = new AbortController();
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const locationsParam = includeLocationResults ? "" : "&locations=0";
        const positionParam = userLocation ? `&lat=${userLocation.lat}&lng=${userLocation.lng}` : "";
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}${locationsParam}${positionParam}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setTags(data.tags ?? []);
        setResults(data.results ?? []);
        setCities(data.cities ?? []);
        setAddresses(data.addresses ?? []);
        setOpen(true);
      } catch (err) {
        // A superseded request — its response is stale by definition, so
        // drop it instead of letting it clobber whatever the newer request
        // already put in state.
        if (err instanceof DOMException && err.name === "AbortError") return;
        throw err;
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(handle);
      controller.abort();
    };
    // userLocation: intentionally included — once geolocation resolves
    // while a query is already showing, the ranking should pick that up
    // rather than stay stuck on the location-blind results from before it
    // arrived.
  }, [query, queryTooShort, includeLocationResults, userLocation]);

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
        // Defensive, not just the server-side skip in api/search — stale
        // city/address state from a previous fetch (e.g. right after this
        // prop flips) shouldn't leak into a bar that isn't supposed to show
        // them.
        ...(includeLocationResults
          ? cities.map((city): Row => ({
              kind: "city",
              key: `city-${city.label}-${city.lat}`,
              title: city.label,
              subtitle: city.subtitle,
              city,
            }))
          : []),
        ...(includeLocationResults
          ? addresses.map((address): Row => ({
              kind: "address",
              key: `address-${address.label}-${address.lat}`,
              title: address.label,
              subtitle: address.subtitle,
              city: address,
            }))
          : []),
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
    if (row.kind === "city" || row.kind === "address") onSelectCity(row.city);
    else if (row.kind === "tag") onSelectTag(row.tag);
    else onSelectResult(row.result);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Enter jumps straight to the top suggestion — the same one a mouse
    // click would pick first — instead of doing nothing until the user
    // reaches for the dropdown.
    if (e.key === "Enter" && open && rows.length > 0) {
      e.preventDefault();
      selectRow(rows[0]);
    }
  }

  return (
    // mx-auto: this bar renders narrower (max-w-xl) than some parents give
    // it (e.g. LocationWeather's centered max-w-2xl column on the home
    // page) — without it, a plain block element sits flush at the start of
    // that extra space instead of centered in it. On the map, where this
    // sits in a flex-1 slot right next to the filter button, the assigned
    // width already equals max-w-xl with no slack left to auto-center
    // into, so this is a no-op there.
    <div ref={containerRef} className="relative mx-auto w-full max-w-xl">
      {/* Purely decorative (aria-hidden) — the input's placeholder already
          says what to do, this just makes "this is a search field" legible
          at a glance the way every other search bar looks. pointer-events-
          none so it never steals the click focus should intend for the
          input itself. */}
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-500">
        <SearchIcon />
      </span>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.trim().length >= 2 && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full border border-gray-300 bg-white py-2.5 pr-4 pl-10 text-sm text-gray-900 transition-colors focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 ${inputRoundingClassName}`}
      />
      {open && (loading || rows.length > 0 || query.trim().length >= 2) && (
        // min(24rem, ...) — 24rem (max-h-96) is the usual cap; the
        // viewport-relative half of the min() is what actually guarantees
        // this never reaches past the bottom of a short/locked-scroll
        // viewport (see MapFilterButton's panel for the same reasoning).
        // z-50: above this app's persistent chrome (Header z-40, BottomNav
        // z-30), not just above ordinary page content — see QrCodeSection's
        // tooltip for the full reasoning. On the homepage both of those
        // are visible at once, and this dropdown sits right under the
        // header.
        <div className="absolute z-50 mt-1 max-h-[min(24rem,calc(100dvh-6rem))] w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
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
