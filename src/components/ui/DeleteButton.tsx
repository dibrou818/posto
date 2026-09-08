/** A `<form action>` wrapping a single "Supprimer" text button — the shape
 * every delete-this-row control in the dashboard uses. */
export function DeleteButton({
  action,
  label = "Supprimer",
  className = "text-xs",
}: {
  action: () => Promise<void>;
  label?: string;
  className?: string;
}) {
  return (
    <form action={action}>
      <button
        type="submit"
        className={`rounded text-red-600 transition-colors hover:text-red-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/30 ${className}`.trim()}
      >
        {label}
      </button>
    </form>
  );
}
