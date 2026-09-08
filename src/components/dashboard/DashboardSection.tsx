import type { ReactNode } from "react";

/** A titled block in the place-edit dashboard — one per form (info, hours,
 * tags, activities, events). Keeps the heading style in one place so a new
 * section is a two-line addition instead of copy-pasted markup. */
export function DashboardSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-gray-500 uppercase">{title}</h2>
      {children}
    </section>
  );
}
