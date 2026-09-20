import type { ReactNode } from "react";
import { requireUser } from "@/lib/supabase/server";
import { getPlacesByOwner } from "@/lib/queries";
import { ProSidebar } from "@/components/dashboard/ProSidebar";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { supabase, user } = await requireUser();
  const places = await getPlacesByOwner(supabase, user.id);

  return (
    <div className="flex min-h-dvh w-full flex-col bg-gray-50 lg:flex-row">
      <ProSidebar
        places={places.map((place) => ({
          id: place.id,
          name: place.name,
          coverPhotoUrl: place.cover_photo_url,
        }))}
      />
      <div className="min-w-0 w-full flex-1">{children}</div>
    </div>
  );
}
