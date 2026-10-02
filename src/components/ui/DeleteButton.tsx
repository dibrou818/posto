"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-10 items-center rounded-lg bg-red-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/40 focus-visible:ring-offset-2 disabled:opacity-60"
    >
      {pending ? "Suppression..." : "Confirmer"}
    </button>
  );
}

/** A delete control that confirms in place, in two clicks: "Supprimer" turns
 * into "Confirmer / Annuler" right where it is (no browser popup, which is
 * ugly on a phone and unreliable inside a web app), and goes back to normal
 * by itself after a few seconds. Without `confirmMessage` it deletes on the
 * first click, as before. For the one catastrophic delete (the whole place,
 * see DeletePlaceSection) a typed confirmation is used instead. */
export function DeleteButton({
  action,
  label = "Supprimer",
  className = "text-xs",
  confirmMessage,
  onDeleted,
  unstyled = false,
}: {
  action: () => Promise<void>;
  label?: string;
  className?: string;
  /** Shown while waiting for the second click, and read out to screen readers. */
  confirmMessage?: string;
  /** Runs after `action` resolves — for a delete button on the deleted
   * thing's own page, which has nothing left to show and must navigate away. */
  onDeleted?: () => void;
  /** Use `className` as the whole style of the first button (it's a plain red text link otherwise). */
  unstyled?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 8000);
    return () => clearTimeout(timer);
  }, [confirming]);

  async function handleAction() {
    await action();
    setConfirming(false);
    onDeleted?.();
  }

  if (confirming) {
    return (
      <form action={handleAction} className="inline-flex flex-wrap items-center gap-2" role="alert">
        <span className="sr-only">{confirmMessage}</span>
        <ConfirmButton />
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="inline-flex min-h-10 items-center rounded-lg px-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          Annuler
        </button>
      </form>
    );
  }

  return (
    <form action={handleAction}>
      <button
        type={confirmMessage ? "button" : "submit"}
        onClick={confirmMessage ? () => setConfirming(true) : undefined}
        className={unstyled ? className : `rounded text-red-600 transition-colors hover:text-red-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/30 ${className}`.trim()}
      >
        {label}
      </button>
    </form>
  );
}
