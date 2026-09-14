"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";

/** Collapsed by default — just the current email + "Modifier" — so nothing
 * pre-filled or pre-validated is ever on screen before the owner actually
 * asks to change anything. `autoComplete="off"` on the new-email field: a
 * plain `type="email"` input with `autoComplete="email"` here would invite
 * the browser to silently autofill it with the account's own saved email
 * the moment the form appears, which is exactly what produced the "c'est
 * déjà votre adresse actuelle" error nobody asked for.
 *
 * Updates via the client SDK directly — Supabase sends a confirmation link
 * to the new address before the change actually takes effect, so the
 * displayed email only updates on the next real sign-in after that's
 * confirmed, not the moment this form is submitted. */
export function ChangeEmailSection({ currentEmail }: { currentEmail: string }) {
  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  function cancel() {
    setExpanded(false);
    setEmail("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (trimmed.toLowerCase() === currentEmail.toLowerCase()) {
      setError("C'est déjà votre adresse actuelle.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: trimmed });
    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setEmail("");
    setExpanded(false);
    setSent(true);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-900">{currentEmail}</p>
        {!expanded && (
          <button
            type="button"
            onClick={() => {
              setExpanded(true);
              setSent(false);
            }}
            className="text-sm font-medium text-gray-700 underline transition-colors hover:text-gray-900"
          >
            Modifier
          </button>
        )}
      </div>

      {sent && !expanded && (
        <p className="text-sm font-medium text-green-600">
          Email de confirmation envoyé à la nouvelle adresse — le changement prend effet une fois le
          lien cliqué.
        </p>
      )}

      {expanded && (
        <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-3 border-t border-gray-100 pt-3">
          <TextField
            label="Nouvelle adresse email"
            type="email"
            autoComplete="off"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center gap-3">
            <Button type="submit" size="compact" disabled={saving}>
              {saving ? "Envoi..." : "Confirmer"}
            </Button>
            <button
              type="button"
              onClick={cancel}
              className="text-sm text-gray-600 transition-colors hover:text-gray-900"
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
