import { createClient } from "@/lib/supabase/server";
import { getAllPlaces } from "@/lib/queries";
import { FullScreenMap } from "@/components/FullScreenMap";

export default async function MapPage() {
  const supabase = await createClient();
  const places = await getAllPlaces(supabase);

  return <FullScreenMap places={places} />;
}
