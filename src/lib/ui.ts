/** Shared visual primitives: dark Posto identity, quiet surfaces, touch-sized controls.
 * Radius scale: 12 for controls (inputs, buttons), 16 for cards, 24 for sheets. */
export const inputClass = "min-h-12 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-500 transition-[border-color,box-shadow] focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 disabled:bg-gray-100 disabled:text-gray-500";
export const compactInputClass = "min-h-11 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10";
export const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";
export function buttonClass(size: "default" | "compact" = "default", className = "") {
  return `inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-medium text-on-accent transition-[transform,background-color] hover:bg-brand-hover active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 disabled:opacity-50 ${size === "compact" ? "min-h-11 px-3 py-2" : "px-5 py-3"} ${className}`.trim();
}
export const cardClass = "rounded-2xl border border-gray-200 bg-white shadow-[var(--shadow-card)] transition-[border-color,box-shadow] hover:border-gray-300 hover:shadow-[var(--shadow-float)]";
