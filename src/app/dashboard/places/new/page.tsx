import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlaceForm } from "@/components/dashboard/PlaceForm";
import { createPlace } from "@/app/dashboard/actions";

export default async function NewPlacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8">
      <h1 className="mb-6 text-xl font-bold text-gray-900">Nouveau lieu</h1>
      <PlaceForm action={createPlace} />
    </div>
  );
}
