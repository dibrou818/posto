import type { Metadata } from "next";
import { safeAuthRedirect } from "@/lib/authRedirect";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Connexion · Posto", robots: { index: false, follow: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect(safeAuthRedirect(next));

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
      <h1 className="posto-title text-gray-900">Connexion</h1>
      <p className="max-w-sm text-center text-sm text-gray-500">
        Retrouvez vos événements enregistrés, suivez vos lieux préférés et accédez à votre espace professionnel.
      </p>
      <LoginForm nextPath={next} />
    </div>
  );
}
