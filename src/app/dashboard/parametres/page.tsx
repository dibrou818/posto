import { requireUser } from "@/lib/supabase/server";
import { FormSection } from "@/components/dashboard/FormSection";
import { ChangeEmailSection } from "@/components/dashboard/ChangeEmailSection";
import { ChangePasswordSection } from "@/components/dashboard/ChangePasswordSection";
import { DeleteAccountSection } from "@/components/dashboard/DeleteAccountSection";
import { SignOutButton } from "@/components/SignOutButton";
import { deleteAccount } from "@/app/dashboard/actions";

export default async function AccountSettingsPage() {
  const { user } = await requireUser();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-6 pb-16 sm:px-8 sm:pt-8">
      <h1 className="posto-title mb-6 text-gray-900">Paramètres du compte</h1>

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

      <FormSection

        title="Supprimer le compte"

        description="Efface aussi, définitivement, tous vos lieux et tout ce qui leur est rattaché : horaires, activités, événements, codes QR et affiches."

      >

        <DeleteAccountSection action={deleteAccount} />

      </FormSection>
    </div>
  );
}
