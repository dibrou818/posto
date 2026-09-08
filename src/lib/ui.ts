// Shared Tailwind class strings for form controls, so the same visual style
// isn't retyped in every form component.
export const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none";

export const compactInputClass = "rounded-md border border-gray-300 px-3 py-1.5 text-sm";

export const labelClass = "mb-1 block text-sm font-medium text-gray-700";

/** Primary (dark) button style. `size` controls padding; `className` appends
 * one-off layout modifiers (e.g. "self-start", "mt-2") at each call site. */
export function buttonClass(size: "default" | "compact" = "default", className = "") {
  const padding = size === "compact" ? "px-3 py-1.5" : "px-4 py-2";
  return `rounded-md bg-gray-900 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 ${padding} ${className}`.trim();
}
