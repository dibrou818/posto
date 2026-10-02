import { requireUser } from "@/lib/supabase/server";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { ChangeEmailSection } from "@/components/dashboard/ChangeEmailSection";
import { ChangePasswordSection } from "@/components/dashboard/ChangePasswordSection";
import { DeleteAccountSection } from "@/components/dashboard/DeleteAccountSection";
import { SignOutButton } from "@/components/SignOutButton";
import { deleteAccount } from "@/app/dashboard/actions";
import { LinkButton } from "@/components/ui/LinkButton";

export default async function AccountSettingsPage() {
  const { user } = await requireUser();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <LinkButton href="/dashboard" icon="back" className="mb-4">
        Retour à mes lieux
      </LinkButton>

      <h1 className="mb-6 text-xl font-bold text-gray-900">Paramètres du compte</h1>

      <DashboardSection title="Adresse email">
        <ChangeEmailSection currentEmail={user.email ?? ""} />
      </DashboardSection>

      <DashboardSection title="Mot de passe">
        <ChangePasswordSection email={user.email ?? ""} />
      </DashboardSection>

      {/* A plain button in the page flow, not its own titled card — signing
          out isn't a "setting" the way email/password/deletion are, just an
          action that belongs with the rest of this page's account controls
          rather than duplicated in the desktop header (see SignOutButton). */}
      <div className="mb-6">
        <SignOutButton />
      </div>

      <DeleteAccountSection action={deleteAccount} />
    </div>
  );
}
