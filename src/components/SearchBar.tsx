"use client";

import { useEffect, useRef, useState } from "react";

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

interface Props {
  onSelectTag: (tag: TagResult) => void;
  onSelectResult: (result: SearchResult) => void;
  placeholder?: string;
}

export function SearchBar({
  onSelectTag,
  onSelectResult,
  placeholder = "Rechercher un lieu, une activité, un tag...",
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<TagResult[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
  const visibleTags = queryTooShort ? [] : tags;
  const visibleResults = queryTooShort ? [] : results;
  const hasContent = visibleTags.length > 0 || visibleResults.length > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.trim().length >= 2 && setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none"
      />
      {open && (loading || hasContent || query.trim().length >= 2) && (
        <div className="absolute z-20 mt-1 max-h-96 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {loading && <div className="px-4 py-3 text-sm text-gray-400">Recherche...</div>}

          {!loading && visibleTags.length > 0 && (
            <div className="border-b border-gray-100 py-1">
              <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Tags correspondants
              </p>
              {visibleTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => {
                    onSelectTag(tag);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  Voir tous les lieux taggés <strong>{tag.label}</strong>
                </button>
              ))}
            </div>
          )}

          {!loading && visibleResults.length > 0 && (
            <div className="py-1">
              <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Résultats
              </p>
              {visibleResults.map((r) => (
                <button
                  key={`${r.result_type}-${r.id}`}
                  onClick={() => {
                    setOpen(false);
                    setQuery("");
                    onSelectResult(r);
                  }}
                  className="flex w-full flex-col px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <span className="font-medium">{r.title}</span>
                  {r.subtitle && <span className="text-xs text-gray-400">{r.subtitle}</span>}
                </button>
              ))}
            </div>
          )}

          {!loading && !hasContent && (
            <div className="px-4 py-3 text-sm text-gray-400">Aucun résultat</div>
          )}
        </div>
      )}
    </div>
  );
}
