/** Shared visual primitives: dark Posto identity, quiet surfaces, touch-sized controls. */
export const inputClass = "min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-base text-gray-900 placeholder:text-gray-500 transition-colors focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 disabled:bg-gray-100 disabled:text-gray-500";
export const compactInputClass = "min-h-11 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10";
export const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";
export function buttonClass(size: "default" | "compact" = "default", className = "") {
  return `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gray-900 text-sm font-semibold text-white transition-colors hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-50 ${size === "compact" ? "px-3 py-2" : "px-5 py-2.5"} ${className}`.trim();
}
export const cardClass = "rounded-2xl border border-gray-200 bg-white shadow-[var(--shadow-card)] transition-colors hover:border-gray-400";
