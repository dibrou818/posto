import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getAllPlaces, getUpcomingEvents } from "@/lib/queries";
import { FullScreenMap } from "@/components/FullScreenMap";

export default async function MapPage() {
  const supabase = await createClient();
  const [places, events] = await Promise.all([
    getAllPlaces(supabase),
    getUpcomingEvents(supabase),
  ]);

  return (
    <Suspense>
      <FullScreenMap places={places} events={events} />
    </Suspense>
  );
}
