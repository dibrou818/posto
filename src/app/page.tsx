import { createClient } from "@/lib/supabase/server";
import { getAllPlaces, getUpcomingEvents } from "@/lib/queries";
import { HomeExplorer } from "@/components/HomeExplorer";

export default async function HomePage() {
  const supabase = await createClient();
  const [places, events] = await Promise.all([
    getAllPlaces(supabase),
    getUpcomingEvents(supabase),
  ]);

  return <HomeExplorer places={places} events={events} />;
}
