import { createClient } from "@/lib/supabase/server";
import { getAllPlaces } from "@/lib/queries";
import { HomeExplorer } from "@/components/HomeExplorer";

export default async function HomePage() {
  const supabase = await createClient();
  const places = await getAllPlaces(supabase);

  return <HomeExplorer places={places} />;
}
