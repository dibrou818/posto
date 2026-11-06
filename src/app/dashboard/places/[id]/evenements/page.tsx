import { getOwnedPlace } from "@/lib/dashboardPlace";
import { getAllEventsForPlace } from "@/lib/queries";
import { EventsManager } from "@/components/dashboard/EventsManager";
import { getQrScanStats, type QrScanStats } from "@/lib/qrScans";
import { getEventStatus } from "@/lib/dashboardEventStatus";

export default async function PlaceEventsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await getOwnedPlace(id);

  const events = await getAllEventsForPlace(supabase, id);

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
      scanStatsById={scanStatsById}
    />
  );
}
