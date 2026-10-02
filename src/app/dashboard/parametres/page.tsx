import { requireUser } from "@/lib/supabase/server";
import { FormSection } from "@/components/dashboard/FormSection";
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

      <FormSection first title="Adresse email" description="Elle sert à vous connecter et à recevoir les messages de Posto.">
        <ChangeEmailSection currentEmail={user.email ?? ""} />
      </FormSection>

      <FormSection title="Mot de passe" description="Choisissez un mot de passe d'au moins 6 caractères.">
        <ChangePasswordSection email={user.email ?? ""} />
      </FormSection>

      <FormSection title="Session" description="Vous déconnecter de cet appareil.">
        <div>
          <SignOutButton />
        </div>
      </FormSection>

      <DeleteAccountSection action={deleteAccount} />
    </div>
  );
}
