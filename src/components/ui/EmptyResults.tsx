"use client";

import { buttonClass } from "@/lib/ui";

type Action = { label: string; onClick: () => void; primary?: boolean };

/** What a list says when filters leave it empty: what happened, and one or
 * two ways out — never just a dead "nothing here". */
export function EmptyResults({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions: Action[];
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-gray-50 px-6 py-10 text-center">
      <span aria-hidden="true" className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-500">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
          <circle cx="9" cy="9" r="5.5" />
          <path d="m13.5 13.5 3.5 3.5" strokeLinecap="round" />
        </svg>
      </span>
      <h3 className="posto-heading text-lg text-gray-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-gray-600">{description}</p>}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className={
              action.primary
                ? buttonClass("compact", "px-4")
                : "min-h-11 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/30"
            }
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
