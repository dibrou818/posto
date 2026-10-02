import type { ReactNode } from "react";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getPlaceById } from "@/lib/queries";
import { getOpenStatus, formatOpenStatus } from "@/lib/opening-hours";
import { LinkButton } from "@/components/ui/LinkButton";

// Shared by every /dashboard/places/[id]/* sub-page: the "which place am I
// editing" header (photo, name, open/closed status, link to its public
// page) and the tab nav between sections — fetched and rendered once here
// instead of by each page, so switching tabs never has to re-fetch or
// re-flash this part of the screen.
export default async function PlaceDashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const place = await getPlaceById(supabase, id);
  if (!place) notFound();
  if (place.owner_id !== user.id) redirect("/dashboard");

  const openStatus = getOpenStatus(place.opening_hours);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-center gap-3 border-b border-gray-200 pb-5">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:h-14 sm:w-14">
          {place.cover_photo_url && (
            <Image src={place.cover_photo_url} alt="" fill sizes="56px" className="object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-gray-900">{place.name}</h1>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className={openStatus.open ? "font-medium text-green-600" : "font-medium text-red-500"}>
              {formatOpenStatus(openStatus)}
            </span>
          </div>
        </div>
        <LinkButton href={`/places/${place.id}`} icon="external" className="w-full sm:w-auto">
          Voir la fiche publique
        </LinkButton>
      </div>

      {children}
    </div>
  );
}
