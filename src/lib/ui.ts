// Shared Tailwind class strings for form controls, so the same visual style
// isn't retyped in every form component.
export const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 transition-colors focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10";

export const compactInputClass =
  "rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 transition-colors focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10";

export const labelClass = "mb-1 block text-sm font-medium text-gray-700";

/** Primary (dark) button style. `size` controls padding; `className` appends
 * one-off layout modifiers (e.g. "self-start", "mt-2") at each call site. */
export function buttonClass(size: "default" | "compact" = "default", className = "") {
  const padding = size === "compact" ? "px-3 py-1.5" : "px-4 py-2";
  return `rounded-lg bg-gray-900 text-sm font-medium text-white transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/30 focus:ring-offset-2 disabled:opacity-50 ${padding} ${className}`.trim();
}

/** Card surface used for content blocks (place cards, list rows, panels) —
 * one radius/shadow language shared across the app instead of each
 * component picking its own. */
export const cardClass =
  "rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md";
