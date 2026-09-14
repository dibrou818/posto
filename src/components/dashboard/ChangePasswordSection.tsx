"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";

// Supabase Auth's own default minimum — matches what the server would
// reject anyway, so the error surfaces here instead of after a round trip.
const MIN_PASSWORD_LENGTH = 6;

/** Collapsed by default — just a masked placeholder + "Modifier" — same
 * disclosure shape as ChangeEmailSection, so neither field is ever sitting
 * pre-filled or pre-validated on screen before the owner asks to change
 * anything.
 *
 * Asks for the current password too, not just the new one:
 * `supabase.auth.updateUser` trusts the active session alone and doesn't
 * check it — re-verifying it here (a plain sign-in attempt, thrown away
 * either way) is what actually confirms "this is really you" typing a new
 * password, not just "you're still logged in on this device". */
export function ChangePasswordSection({ email }: { email: string }) {
  const [expanded, setExpanded] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const supabase = createClient();

  function cancel() {
    setExpanded(false);
    setCurrentPassword("");
    setPassword("");
    setConfirmPassword("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Le nouveau mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setSaving(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    if (signInError) {
      setSaving(false);
      setError("Mot de passe actuel incorrect.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setCurrentPassword("");
    setPassword("");
    setConfirmPassword("");
    setExpanded(false);
    setDone(true);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm tracking-widest text-gray-900">••••••••</p>
        {!expanded && (
          <button
            type="button"
            onClick={() => {
              setExpanded(true);
              setDone(false);
            }}
            className="text-sm font-medium text-gray-700 underline transition-colors hover:text-gray-900"
          >
            Modifier
          </button>
        )}
      </div>

      {done && !expanded && <p className="text-sm font-medium text-green-600">Mot de passe mis à jour ✓</p>}

      {expanded && (
        <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-3 border-t border-gray-100 pt-3">
          <TextField
            label="Mot de passe actuel"
            type="password"
            autoComplete="current-password"
            required
            autoFocus
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <TextField
            label="Nouveau mot de passe"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <TextField
            label="Confirmer le nouveau mot de passe"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center gap-3">
            <Button type="submit" size="compact" disabled={saving}>
              {saving ? "Enregistrement..." : "Modifier le mot de passe"}
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
