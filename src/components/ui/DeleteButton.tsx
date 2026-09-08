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
      <button type="submit" className={`text-red-600 hover:underline ${className}`.trim()}>
        {label}
      </button>
    </form>
  );
}
