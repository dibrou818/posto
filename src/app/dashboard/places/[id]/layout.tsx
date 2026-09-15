import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getPlaceById } from "@/lib/queries";
import { getOpenStatus, formatOpenStatus } from "@/lib/opening-hours";
import { BackButton } from "@/components/ui/BackButton";
import { PlaceDashboardTabs } from "@/components/dashboard/PlaceDashboardTabs";
import { buttonClass } from "@/lib/ui";

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
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-4 flex items-center gap-3">
        <BackButton fallbackHref="/dashboard" />
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 transition-colors hover:text-gray-900 focus:outline-none focus-visible:underline"
        >
          Mes lieux
        </Link>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
          {place.cover_photo_url && (
            <Image src={place.cover_photo_url} alt="" fill sizes="56px" className="object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-gray-900">{place.name}</h1>
          <div className="flex items-center gap-2 text-xs">
            <span className={openStatus.open ? "font-medium text-green-600" : "font-medium text-red-500"}>
              {formatOpenStatus(openStatus)}
            </span>
            <Link
              href={`/places/${place.id}`}
              target="_blank"
              className="text-gray-500 underline-offset-2 hover:text-gray-900 hover:underline"
            >
              Voir la fiche publique ↗
            </Link>
          </div>
        </div>
        <Link href="/dashboard" className={buttonClass("compact")}>
          Terminé
        </Link>
      </div>

      <div className="mb-6">
        <PlaceDashboardTabs placeId={id} />
      </div>

      {children}
    </div>
  );
}
