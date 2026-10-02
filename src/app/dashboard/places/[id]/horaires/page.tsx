import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getPlaceById } from "@/lib/queries";
import { OpeningHoursForm } from "@/components/dashboard/OpeningHoursForm";
import { saveOpeningHours } from "@/app/dashboard/actions";

export default async function PlaceHoursPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const place = await getPlaceById(supabase, id);
  if (!place) notFound();
  if (place.owner_id !== user.id) redirect("/dashboard");

  return (
    <OpeningHoursForm hours={place.opening_hours} action={saveOpeningHours.bind(null, id)} />
  );
}
