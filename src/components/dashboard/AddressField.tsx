"use client";

import { useEffect, useId, useRef, useState } from "react";
import { inputClass } from "@/lib/ui";
import type { AddressSuggestion } from "@/app/api/geocode/route";

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 350;

function PinIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true">
      <path d="M10 18s6-5.5 6-10a6 6 0 1 0-12 0c0 4.5 6 10 6 10Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="8" r="2.2" />
    </svg>
  );
}

/** Address input with autocomplete: the owner types, picks the right
 * address from the suggestions, and that's it — the place's position (lat/
 * lng) and its city/postcode/quartier are saved alongside as hidden fields,
 * never shown. Until an address has been picked from the list the field
 * reports itself invalid, so a typed-but-unchosen address can't be saved
 * with a missing or stale position. */
export function AddressField({
  defaultAddress = "",
  defaultLat,
  defaultLng,
  defaultCity,
  defaultPostcode,
  defaultSuburb,
}: {
  defaultAddress?: string | null;
  defaultLat?: number | null;
  defaultLng?: number | null;
  defaultCity?: string | null;
  defaultPostcode?: string | null;
  defaultSuburb?: string | null;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(defaultAddress ?? "");
  const [lat, setLat] = useState(defaultLat != null ? String(defaultLat) : "");
  const [lng, setLng] = useState(defaultLng != null ? String(defaultLng) : "");
  const [city, setCity] = useState(defaultCity ?? "");
  const [postcode, setPostcode] = useState(defaultPostcode ?? "");
  const [suburb, setSuburb] = useState(defaultSuburb ?? "");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const confirmed = Boolean(lat && lng);

  // Native validation message instead of custom submit handling: the browser
  // blocks the submit and points at this field until a suggestion is picked.
  useEffect(() => {
    inputRef.current?.setCustomValidity(confirmed ? "" : "Choisissez votre adresse dans la liste proposée.");
  }, [confirmed]);

  // Debounced search, ignoring any response that arrives after a newer one.
  useEffect(() => {
    if (confirmed || query.trim().length < MIN_QUERY_LENGTH) return;
    let stale = false;
    const timer = setTimeout(async () => {
      setStatus("loading");
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (stale) return;
        if (!res.ok) throw new Error(data.error);
        setSuggestions(data.results ?? []);
        setStatus("done");
        setActive(-1);
      } catch {
        if (!stale) setStatus("error");
      }
    }, DEBOUNCE_MS);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [query, confirmed]);

  function handleChange(value: string) {
    setQuery(value);
    // Editing the text invalidates the previous pick.
    setLat("");
    setLng("");
    setCity("");
    setPostcode("");
    setSuburb("");
    setOpen(true);
    if (value.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setStatus("idle");
    }
  }

  function pick(item: AddressSuggestion) {
    setQuery(item.label);
    setLat(String(item.lat));
    setLng(String(item.lng));
    setCity(item.city ?? "");
    setPostcode(item.postcode ?? "");
    setSuburb(item.suburb ?? "");
    setSuggestions([]);
    setOpen(false);
    setStatus("idle");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      pick(suggestions[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && !confirmed && query.trim().length >= MIN_QUERY_LENGTH;
  const listId = `${id}-list`;

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        Adresse
      </label>
      <input
        ref={inputRef}
        id={id}
        name="address"
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
        autoComplete="off"
        required
        placeholder="Ex : 12 rue Nationale, Lille"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={handleKeyDown}
        className={inputClass}
      />
      <input type="hidden" name="lat" value={lat} />
      <input type="hidden" name="lng" value={lng} />
      <input type="hidden" name="city" value={city} />
      <input type="hidden" name="postcode" value={postcode} />
      <input type="hidden" name="suburb" value={suburb} />

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full right-0 left-0 z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
        >
          {status === "loading" && suggestions.length === 0 && (
            <li className="px-3 py-2.5 text-sm text-gray-500">Recherche…</li>
          )}
          {status === "error" && <li className="px-3 py-2.5 text-sm text-red-600">Recherche indisponible, réessayez.</li>}
          {status === "done" && suggestions.length === 0 && (
            <li className="px-3 py-2.5 text-sm text-gray-500">Aucune adresse trouvée. Ajoutez le numéro et la ville.</li>
          )}
          {suggestions.map((item, index) => (
            <li
              key={item.label}
              id={`${id}-opt-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(item);
              }}
              onMouseEnter={() => setActive(index)}
              className={`flex cursor-pointer items-center gap-2.5 px-3 py-2.5 text-sm text-gray-900 ${index === active ? "bg-gray-100" : ""}`}
            >
              <PinIcon />
              <span className="min-w-0 truncate">{item.label}</span>
            </li>
          ))}
        </ul>
      )}

      <p className={`mt-1.5 text-sm ${confirmed ? "text-green-600" : "text-gray-500"}`}>
        {confirmed ? "Adresse confirmée ✓" : "Tapez votre adresse, puis choisissez-la dans la liste."}
      </p>
    </div>
  );
}
