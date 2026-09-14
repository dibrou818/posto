"use client";

import type { ChangeEvent } from "react";

function UploadIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 12.5V3.5" />
      <path d="M6.5 7 10 3.5 13.5 7" />
      <path d="M4 13v1.5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V13" />
    </svg>
  );
}

/** Styled trigger for a native `<input type="file">`, in French, instead of
 * the browser's own unstyled (and English-on-most-systems) "Choose File"
 * button — cross-browser, the only reliable way to restyle/relabel that
 * button at all is to visually hide the real input and drive it through a
 * `<label htmlFor>` (fully native click/keyboard/focus behavior, no JS
 * needed to open the picker). `id` must be unique per instance — a form
 * with more than one of these (e.g. PlaceForm's cover photo + gallery)
 * needs a distinct one each so the label targets the right input. */
export function PhotoPickerButton({
  id,
  onChange,
  disabled,
  label = "Choisir une photo",
}: {
  id: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <label
      htmlFor={id}
      className={`inline-flex w-fit items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-gray-50"
      }`}
    >
      <UploadIcon />
      {label}
      <input
        id={id}
        type="file"
        accept="image/*"
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
      />
    </label>
  );
}
