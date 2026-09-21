"use client";

import { safeAuthRedirect } from "@/lib/authRedirect";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";

export function LoginForm({ nextPath = "/account" }: { nextPath?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    let result;
    try { result = await supabase.auth.signInWithPassword({ email, password }); }
    catch { setError("Connexion impossible. Vérifiez votre réseau et réessayez."); setLoading(false); return; }
    const { error } = result;

    setLoading(false);
    if (error) {
      setError(error.code === "invalid_credentials" ? "Email ou mot de passe incorrect." : "Connexion impossible. Vérifiez la confirmation de votre email puis réessayez.");
      return;
    }

    router.push(safeAuthRedirect(nextPath));
    router.refresh();
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
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <Button type="submit" disabled={loading} className="mt-1">
        {loading ? "Connexion..." : "Se connecter"}
      </Button>
      <p className="text-sm text-gray-500">
        Pas encore de compte ?{" "}
        <Link href={`/signup?next=${encodeURIComponent(safeAuthRedirect(nextPath))}`} className="font-medium text-gray-900 underline">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}
