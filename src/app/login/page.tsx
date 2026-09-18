import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/auth/LoginForm";

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

  if (user) redirect(next?.startsWith("/") && !next.startsWith("//") ? next : "/account");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
      <h1 className="text-xl font-bold text-gray-900">Connexion</h1>
      <p className="max-w-sm text-center text-sm text-gray-500">
        Retrouvez vos événements enregistrés, suivez vos lieux préférés et accédez à votre espace professionnel.
      </p>
      <LoginForm nextPath={next} />
    </div>
  );
}
