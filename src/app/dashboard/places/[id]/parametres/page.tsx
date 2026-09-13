import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getPlaceById } from "@/lib/queries";
import { DeletePlaceSection } from "@/components/dashboard/DeletePlaceSection";
import { deletePlace } from "@/app/dashboard/actions";

export default async function PlaceSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const place = await getPlaceById(supabase, id);
  if (!place) notFound();
  if (place.owner_id !== user.id) redirect("/dashboard");

  return <DeletePlaceSection placeName={place.name} action={deletePlace.bind(null, id)} />;
}
