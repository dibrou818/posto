import type { ReactNode } from "react";

/** A titled block in the place-edit dashboard — one per form (info, hours,
 * tags, activities, events). Each one is its own card: on a page this long,
 * a flat scroll of unbroken sections makes it hard to tell where one form
 * ends and the next begins — a bordered card per section gives that for
 * free, in one shared component instead of repeating it everywhere. */
export function DashboardSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6 rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-gray-500 uppercase">{title}</h2>
      {children}
    </section>
  );
}
