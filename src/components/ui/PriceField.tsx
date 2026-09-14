"use client";

import { useState } from "react";
import { labelClass } from "@/lib/ui";

// Same three qualifiers already present in the real catalog's old free-text
// price ("20€ / équipe", "15€ / partie", "24€ / personne") — kept as a
// fixed small set (not free text) so it stays a real, queryable value.
const UNITS = [
  { value: "", label: "Prix total" },
  { value: "personne", label: "par personne" },
  { value: "equipe", label: "par équipe" },
  { value: "partie", label: "par partie" },
] as const;

const selectClass =
  "min-w-0 shrink-0 rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 transition-colors focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 disabled:opacity-50";
const amountClass =
  "min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 disabled:opacity-50";

function centsToEuros(cents: number | null | undefined): string {
  if (!cents) return "";
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

/** Price input as a "Gratuit" checkbox + a euro amount + a per-unit select,
 * instead of a free-text field an owner had to type by hand ("Gratuit",
 * "10€", "à partir de 10 €", never twice the same way) — the same problem
 * duration_minutes had before DurationField. Composed into two hidden
 * fields (price_cents, price_unit) rather than one combined string: the
 * database itself now holds two real columns, so this maps onto them
 * directly instead of manufacturing a single string just to match the
 * shape of the other compound fields. */
export function PriceField({
  label,
  defaultCents,
  defaultUnit,
}: {
  label?: string;
  defaultCents?: number | null;
  defaultUnit?: string | null;
}) {
  const [free, setFree] = useState(defaultCents === 0);
  const [euros, setEuros] = useState(defaultCents && defaultCents > 0 ? centsToEuros(defaultCents) : "");
  const [unit, setUnit] = useState(defaultUnit ?? "");

  const parsedEuros = euros.trim() ? Number(euros.replace(",", ".")) : null;
  const cents = free ? 0 : parsedEuros !== null && Number.isFinite(parsedEuros) ? Math.round(parsedEuros * 100) : null;

  return (
    <div className="min-w-0">
      {label !== undefined && <label className={labelClass}>{label}</label>}
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <label className="flex shrink-0 items-center gap-1.5 text-sm text-gray-700">
          <input type="checkbox" checked={free} onChange={(e) => setFree(e.target.checked)} />
          Gratuit
        </label>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.5"
          value={euros}
          onChange={(e) => setEuros(e.target.value)}
          disabled={free}
          placeholder="Prix en €"
          aria-label="Prix en euros"
          className={amountClass}
        />
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          disabled={free}
          aria-label="Unité de prix"
          className={selectClass}
        >
          {UNITS.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      </div>
      <input type="hidden" name="price_cents" value={cents === null ? "" : String(cents)} />
      <input type="hidden" name="price_unit" value={free ? "" : unit} />
    </div>
  );
}
