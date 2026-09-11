"use client";

import { useState } from "react";

// Countries actually relevant to a Lille-based local-discovery app: France
// first (the overwhelming majority of owners), its closest neighbors, then
// a few more common ones — not an exhaustive list of every country code,
// which would make the picker itself a chore to use for what's realistically
// always going to be a French number.
const COUNTRIES = [
  { dial: "+33", flag: "🇫🇷", name: "France" },
  { dial: "+32", flag: "🇧🇪", name: "Belgique" },
  { dial: "+41", flag: "🇨🇭", name: "Suisse" },
  { dial: "+352", flag: "🇱🇺", name: "Luxembourg" },
  { dial: "+49", flag: "🇩🇪", name: "Allemagne" },
  { dial: "+44", flag: "🇬🇧", name: "Royaume-Uni" },
  { dial: "+34", flag: "🇪🇸", name: "Espagne" },
  { dial: "+39", flag: "🇮🇹", name: "Italie" },
  { dial: "+1", flag: "🇺🇸🇨🇦", name: "États-Unis / Canada" },
] as const;

const DIAL_CODES = COUNTRIES.map((c) => c.dial).sort((a, b) => b.length - a.length);

/** Splits a stored "+33 6 12 34 56 78"-style value into its country code and
 * local part. A value with no recognized "+XX" prefix (most existing data,
 * saved before this field existed — plain "06 12 34 56 78") is treated as a
 * French number typed as-is, not silently reformatted — the owner sees
 * exactly what was there and can adjust the country if it's actually wrong. */
function parsePhone(stored: string | null | undefined): { dial: string; local: string } {
  const trimmed = (stored ?? "").trim();
  if (trimmed) {
    const dial = DIAL_CODES.find((d) => trimmed.startsWith(d));
    if (dial) return { dial, local: trimmed.slice(dial.length).trim() };
  }
  return { dial: "+33", local: trimmed };
}

/** Phone input split into a country-code picker + local number, composed
 * back into one "+33 6 12 34 56 78"-style string on submit — still posted
 * as the same single `name` field the server action already expects
 * (places.phone stays a plain string column, no schema change needed).
 * Picking the right country up front beats a lone free-text field where
 * it's ambiguous whether "0033" or "+33" or a bare local number is
 * expected. */
export function PhoneField({
  label = "Téléphone",
  name,
  defaultValue,
}: {
  label?: string;
  name: string;
  defaultValue?: string | null;
}) {
  const parsed = parsePhone(defaultValue);
  const [dial, setDial] = useState(parsed.dial);
  const [local, setLocal] = useState(parsed.local);
  const combined = local.trim() ? `${dial} ${local.trim()}` : "";

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex gap-2">
        {/* Not built from inputClass (which bakes in w-full) — combining
            that with a fixed width here is two conflicting `width`
            utilities whose cascade order isn't guaranteed, and it was
            genuinely winning the wrong way (a full-width select pushing the
            number input out of the card). Written out so this element's
            width is unambiguous. */}
        <select
          value={dial}
          onChange={(e) => setDial(e.target.value)}
          aria-label="Indicatif du pays"
          className="w-[7.5rem] shrink-0 rounded-lg border border-gray-300 px-2 py-2 text-sm text-gray-900 transition-colors focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
        >
          {COUNTRIES.map((c) => (
            <option key={c.dial + c.name} value={c.dial}>
              {c.flag} {c.dial}
            </option>
          ))}
        </select>
        <input
          type="tel"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          placeholder="6 12 34 56 78"
          aria-label="Numéro local"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition-colors focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
        />
      </div>
      <input type="hidden" name={name} value={combined} />
    </div>
  );
}
