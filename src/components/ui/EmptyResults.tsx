"use client";

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
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-300 px-6 py-10 text-center">
      <span aria-hidden="true" className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-500">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
          <circle cx="9" cy="9" r="5.5" />
          <path d="m13.5 13.5 3.5 3.5" strokeLinecap="round" />
        </svg>
      </span>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-gray-600">{description}</p>}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className={`min-h-10 rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/30 ${
              action.primary
                ? "bg-gray-900 text-white hover:bg-gray-700"
                : "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
