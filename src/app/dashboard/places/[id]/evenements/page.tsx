import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getPlaceById, getAllEventsForPlace, getAllTags } from "@/lib/queries";
import { EventsManager } from "@/components/dashboard/EventsManager";
import { getQrScanStats, type QrScanStats } from "@/lib/qrScans";
import { getEventStatus } from "@/lib/dashboardEventStatus";
import { createEvent, deleteEvent, duplicateEvent } from "@/app/dashboard/actions";

export default async function PlaceEventsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const place = await getPlaceById(supabase, id);
  if (!place) notFound();
  if (place.owner_id !== user.id) redirect("/dashboard");

  const [events, allTags] = await Promise.all([
    getAllEventsForPlace(supabase, id),
    getAllTags(supabase),
  ]);

  // Scan counts only for events that still matter (not over) and already
  // have a code — one small query pair each, rather than counting scans for
  // every past event nobody is checking on anymore.
  const now = new Date();
  const withScans = events.filter((event) => event.qr_code_url && getEventStatus(event, now).key !== "past");
  const stats = await Promise.all(withScans.map((event) => getQrScanStats(supabase, "event", event.id)));
  const scanStatsById: Record<string, QrScanStats> = {};
  withScans.forEach((event, index) => {
    scanStatsById[event.id] = stats[index];
  });

  return (
    <EventsManager
      placeId={id}
      events={events}
      allTags={allTags}
      placeCoverPhotoUrl={place.cover_photo_url}
      scanStatsById={scanStatsById}
      onCreate={createEvent.bind(null, id)}
      onDelete={deleteEvent.bind(null, id)}
      onDuplicate={duplicateEvent.bind(null, id)}
    />
  );
}
