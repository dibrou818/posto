import type { Metadata } from "next";
import { safeAuthRedirect } from "@/lib/authRedirect";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = { title: "Créer un compte · Posto", robots: { index: false, follow: false } };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect(safeAuthRedirect(next));

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
      <h1 className="posto-title text-gray-900">Créer un compte</h1>
      <p className="max-w-sm text-center text-sm text-gray-500">
        Enregistrez vos sorties, suivez vos lieux préférés et retrouvez-les sur tous vos appareils.
      </p>
      <SignupForm nextPath={next} />
    </div>
  );
}
