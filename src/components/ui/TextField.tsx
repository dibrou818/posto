"use client";

import { useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { inputClass } from "@/lib/ui";

// Shared by TextField and TextareaField: a small "N/max" counter next to the
// label, tinted amber once the field is actually at its limit — a plain
// number is easy to miss, whether you're right up against a limit shouldn't
// require doing the subtraction yourself. Exported for the handful of
// compact, label-less inputs elsewhere (ActivitiesManager/EventsManager's
// quick-add rows) that want the same counter without the rest of this
// wrapper's fuller layout/sizing.
export function CharCounter({ count, max }: { count: number; max: number }) {
  return (
    <span className={`shrink-0 text-xs tabular-nums ${count >= max ? "font-medium text-amber-600" : "text-gray-400"}`}>
      {count}/{max}
    </span>
  );
}

function useCharCount(initial: string | number | readonly string[] | undefined) {
  return useState(() => String(initial ?? "").length);
}

type TextFieldProps = {
  /** Omit to render a bare input with no label row — used for compact
   * placeholder-only forms (e.g. the quick-add rows in ActivitiesManager)
   * that still want a maxLength counter without the fuller label layout. */
  label?: string;
} & InputHTMLAttributes<HTMLInputElement>;

/** Labeled text input, styled consistently across every form in the app.
 * Passing `maxLength` also renders a live "N/max" counter — the field stays
 * uncontrolled as far as its actual value goes (defaultValue still works
 * normally); the counter is a side-effect listener on top, not a rewrite of
 * the input into a controlled one. */
export function TextField({ label, maxLength, className = "", onChange, defaultValue, value, ...props }: TextFieldProps) {
  const [count, setCount] = useCharCount(value ?? defaultValue);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (maxLength !== undefined) setCount(e.target.value.length);
    onChange?.(e);
  }

  return (
    <div>
      {(label !== undefined || maxLength !== undefined) && (
        <div className="mb-1 flex items-baseline justify-between gap-2">
          {label !== undefined ? <label className="text-sm font-medium text-gray-700">{label}</label> : <span />}
          {maxLength !== undefined && <CharCounter count={count} max={maxLength} />}
        </div>
      )}
      <input
        className={`${inputClass} ${className}`.trim()}
        maxLength={maxLength}
        defaultValue={defaultValue}
        value={value}
        onChange={handleChange}
        {...props}
      />
    </div>
  );
}

type TextareaFieldProps = {
  /** See TextField's `label` — same reasoning. */
  label?: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

/** Labeled textarea, same visual style and maxLength/counter behavior as
 * {@link TextField}. */
export function TextareaField({ label, maxLength, className = "", onChange, defaultValue, value, ...props }: TextareaFieldProps) {
  const [count, setCount] = useCharCount(value ?? defaultValue);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    if (maxLength !== undefined) setCount(e.target.value.length);
    onChange?.(e);
  }

  return (
    <div>
      {(label !== undefined || maxLength !== undefined) && (
        <div className="mb-1 flex items-baseline justify-between gap-2">
          {label !== undefined ? <label className="text-sm font-medium text-gray-700">{label}</label> : <span />}
          {maxLength !== undefined && <CharCounter count={count} max={maxLength} />}
        </div>
      )}
      <textarea
        className={`${inputClass} ${className}`.trim()}
        maxLength={maxLength}
        defaultValue={defaultValue}
        value={value}
        onChange={handleChange}
        {...props}
      />
    </div>
  );
}
