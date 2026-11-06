import { getOwnedPlace } from "@/lib/dashboardPlace";
import { OpeningHoursForm } from "@/components/dashboard/OpeningHoursForm";
import { saveOpeningHours } from "@/app/dashboard/actions";

export default async function PlaceHoursPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { place } = await getOwnedPlace(id);

  return (
    <OpeningHoursForm hours={place.opening_hours} action={saveOpeningHours.bind(null, id)} />
  );
}
