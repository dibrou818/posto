import type { ReactNode } from "react";

/** One labeled group of fields on a dashboard edit page — flat and
 * uniform, in the spirit of an account-settings screen: a bold title, a
 * short gray line of help, then the fields, one column. No card or
 * background; groups are separated by space and a hairline. `compact` is a
 * bare stack of fields for a form that already sits inside a framed panel
 * (the "create an event" panel). */
export function FormSection({
  title,
  description,
  compact = false,
  first = false,
  children,
}: {
  title: string;
  description?: ReactNode;
  compact?: boolean;
  /** The first group on a page: no divider or top space above it. */
  first?: boolean;
  children: ReactNode;
}) {
  if (compact) return <div className="flex flex-col gap-4">{children}</div>;
  return (
    <section className={`@container ${first ? "pb-7" : "border-t border-gray-200 py-7"}`}>
      <div className="grid gap-4 @xl:grid-cols-[13rem_minmax(0,1fr)] @xl:gap-10">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-gray-900">{title}</h2>
          {description && <p className="mt-1 text-sm leading-relaxed text-gray-500">{description}</p>}
        </div>
        <div className="flex min-w-0 flex-col gap-4">{children}</div>
      </div>
    </section>
  );
}

/** The save row at the end of a form: stuck to the bottom of the screen
 * while the form is on screen, so the main action is always reachable no
 * matter how far down the fields you've scrolled. `compact` is a plain
 * inline row for forms inside a panel. */
export function FormActions({ compact = false, children }: { compact?: boolean; children: ReactNode }) {
  if (compact) return <div className="pt-1">{children}</div>;
  return (
    <div className="sticky bottom-[var(--pro-bottom-offset,0px)] z-20 -mx-4 flex border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:justify-end">
      {children}
    </div>
  );
}
