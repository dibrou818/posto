"use client";

import { safeAuthRedirect } from "@/lib/authRedirect";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";

export function SignupForm({ nextPath = "/account" }: { nextPath?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    let result;
    try { result = await supabase.auth.signUp({ email, password }); }
    catch { setError("Création impossible. Vérifiez votre réseau et réessayez."); setLoading(false); return; }
    const { data, error } = result;

    setLoading(false);
    if (error) {
      setError("Impossible de créer ce compte. Vérifiez vos informations et réessayez.");
      return;
    }

    if (data.session) {
      router.push(safeAuthRedirect(nextPath));
      router.refresh();
      return;
    }

    setMessage("Compte créé. Vérifiez votre email pour confirmer votre compte avant de vous connecter.");
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <TextField
        label="Mot de passe"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <TextField
        label="Confirmer le mot de passe"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{message}</p>}
      <Button type="submit" disabled={loading} className="mt-1">
        {loading ? "Création..." : "Créer mon compte"}
      </Button>
      <p className="text-sm text-gray-500">
        Déjà un compte ?{" "}
        <Link href={`/login?next=${encodeURIComponent(safeAuthRedirect(nextPath))}`} className="font-medium text-gray-900 underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
