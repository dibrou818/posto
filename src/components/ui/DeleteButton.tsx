"use client";

/** A `<form action>` wrapping a single "Supprimer" text button — the shape
 * every delete-this-row control in the dashboard uses. `confirmMessage`, when
 * given, guards it behind a native confirm() — cheap insurance against a
 * stray tap permanently deleting something with zero warning. For the one
 * delete on this page that's actually catastrophic (the whole place, see
 * DeletePlaceSection) this isn't enough on its own — that one asks for a
 * typed confirmation instead. */
export function DeleteButton({
  action,
  label = "Supprimer",
  className = "text-xs",
  confirmMessage,
  onDeleted,
}: {
  action: () => Promise<void>;
  label?: string;
  className?: string;
  confirmMessage?: string;
  /** Runs after `action` resolves — for a delete button on the deleted
   * thing's own page (an event's edit page, say), where revalidatePath
   * alone can't help: that route has nothing left to show, so it needs to
   * navigate away itself. Rows in a list (the common case) don't need
   * this — the row just disappears once the list re-renders. */
  onDeleted?: () => void;
}) {
  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (confirmMessage && !window.confirm(confirmMessage)) {
      e.preventDefault();
    }
  }

  async function handleAction() {
    await action();
    onDeleted?.();
  }

  return (
    <form action={handleAction}>
      <button
        type="submit"
        onClick={handleClick}
        className={`rounded text-red-600 transition-colors hover:text-red-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/30 ${className}`.trim()}
      >
        {label}
      </button>
    </form>
  );
}
