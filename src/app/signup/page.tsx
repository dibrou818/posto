import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignupForm } from "@/components/auth/SignupForm";

export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/account");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
      <h1 className="text-xl font-bold text-gray-900">Créer un compte</h1>
      <p className="max-w-sm text-center text-sm text-gray-500">
        Enregistrez vos sorties, suivez vos lieux préférés et retrouvez-les sur tous vos appareils.
      </p>
      <SignupForm />
    </div>
  );
}
