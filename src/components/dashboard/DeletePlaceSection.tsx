"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

const CONFIRM_PHRASE = "supprimer ce lieu";

function ConfirmDeleteButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-red-300"
    >
      {pending ? "Suppression..." : "Supprimer définitivement"}
    </button>
  );
}

/** The place's own delete control — deliberately not the plain DeleteButton
 * every other row on this page uses. Deleting a place cascades to
 * everything attached to it (opening hours, tags, activities, events, QR
 * codes, posters), so a single misclick here is far more costly than
 * anywhere else in the dashboard: it gets its own two-step, type-to-confirm
 * flow instead of a native confirm() dialog that's easy to reflexively
 * click through. */
export function DeletePlaceSection({
  placeName,
  action,
}: {
  placeName: string;
  action: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const canDelete = confirmText.trim().toLowerCase() === CONFIRM_PHRASE;

  return (
    <section className="mt-12 rounded-xl border border-red-200 bg-red-50 p-4">
      <h2 className="text-sm font-semibold text-red-800">Zone de danger</h2>
      <p className="mt-1 text-sm text-red-700">
        Supprimer « {placeName} » efface aussi, définitivement, ses horaires, tags, activités,
        événements, codes QR et affiches. Cette action est irréversible.
      </p>

      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600/30"
        >
          Supprimer ce lieu
        </button>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <label htmlFor="delete-place-confirm" className="text-sm font-medium text-red-800">
            Tapez « <span className="font-mono">{CONFIRM_PHRASE}</span> » pour confirmer
          </label>
          <input
            id="delete-place-confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            autoComplete="off"
            className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
          />
          <div className="mt-1 flex items-center gap-3">
            <form action={action}>
              <ConfirmDeleteButton disabled={!canDelete} />
            </form>
            <button
              type="button"
              onClick={() => {
                setExpanded(false);
                setConfirmText("");
              }}
              className="text-sm text-gray-600 transition-colors hover:text-gray-900"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
