import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { ChangeEmailSection } from "@/components/dashboard/ChangeEmailSection";
import { ChangePasswordSection } from "@/components/dashboard/ChangePasswordSection";
import { DeleteAccountSection } from "@/components/dashboard/DeleteAccountSection";
import { deleteAccount } from "@/app/dashboard/actions";

export default async function AccountSettingsPage() {
  const { user } = await requireUser();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link
        href="/dashboard"
        className="mb-4 inline-block text-sm text-gray-500 transition-colors hover:text-gray-900 focus:outline-none focus-visible:underline"
      >
        ← Retour à mes lieux
      </Link>

      <h1 className="mb-6 text-xl font-bold text-gray-900">Paramètres du compte</h1>

      <DashboardSection title="Adresse email">
        <ChangeEmailSection currentEmail={user.email ?? ""} />
      </DashboardSection>

      <DashboardSection title="Mot de passe">
        <ChangePasswordSection email={user.email ?? ""} />
      </DashboardSection>

      <DeleteAccountSection action={deleteAccount} />
    </div>
  );
}
