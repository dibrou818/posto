import type { ReactNode } from "react";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getPlaceById } from "@/lib/queries";
import { getOpenStatus } from "@/lib/opening-hours";
import { OpenStatusLabel } from "@/components/OpenStatusLabel";
import { LinkButton } from "@/components/ui/LinkButton";
import { UrgentBanner } from "@/components/dashboard/UrgentBanner";
import { PlaceDashboardTabs } from "@/components/dashboard/PlaceDashboardTabs";
import { removeUrgentMessage } from "@/app/dashboard/actions";

// Shared by every /dashboard/places/[id]/* sub-page: the place's name and
// live status, then the section tabs — fetched and rendered once here so
// switching tabs never re-flashes this part of the screen.
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
  const urgentActive =
    Boolean(place.urgent_message) &&
    (!place.urgent_message_expires_at || new Date(place.urgent_message_expires_at) > new Date());

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-8">
      <header className="flex items-center gap-4 pt-6 pb-4 sm:pt-8">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100">
          {place.cover_photo_url && <Image src={place.cover_photo_url} alt="" fill sizes="56px" className="object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="posto-heading truncate text-2xl text-gray-900">{place.name}</h1>
          <p className="mt-0.5 flex min-w-0 items-center gap-2 text-sm text-gray-500">
            <OpenStatusLabel status={openStatus} hasHours={place.opening_hours.some((hour) => hour.zone_name === null)} className="shrink-0" />
            {place.address && <span className="hidden truncate sm:inline">· {place.address}</span>}
          </p>
        </div>
        <div className="hidden shrink-0 sm:block">
          <LinkButton href={`/places/${place.id}`} icon="external">
            Voir la fiche
          </LinkButton>
        </div>
      </header>

      <div className="sticky top-14 z-30 border-b border-gray-200 bg-white lg:top-0">
        <PlaceDashboardTabs placeId={place.id} />
      </div>

      <div className="pt-6 pb-16 sm:pt-8">
        {urgentActive && (
          <UrgentBanner
            placeId={place.id}
            message={place.urgent_message!}
            expiresAt={place.urgent_message_expires_at}
            onRemove={removeUrgentMessage.bind(null, place.id)}
          />
        )}
        {children}
        <div className="mt-8 sm:hidden">
          <LinkButton href={`/places/${place.id}`} icon="external" className="w-full">
            Voir la fiche publique
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
