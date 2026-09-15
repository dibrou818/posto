import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEventById } from "@/lib/queries";
import { buildIcsContent, icsFilename } from "@/lib/calendar";
import { getSiteOrigin } from "@/lib/site";

// A real route (not a data: URI handed to <a download>) is the one
// reliably cross-browser way to deliver an .ics file — data: + download
// has a real, documented history of being ignored or mishandled on iOS
// Safari in particular, which is exactly the browser Apple Calendar users
// (the whole point of this route) are on. Serving actual bytes with the
// right Content-Type/Content-Disposition is what makes Safari, Chrome and
// every desktop mail/calendar client treat this as "here's a calendar
// file to import" rather than "here's some text to maybe display".
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const event = await getEventById(supabase, id);
  if (!event) {
    return new NextResponse("Événement introuvable.", { status: 404 });
  }

  const siteOrigin = await getSiteOrigin();
  const content = buildIcsContent({
    id: event.id,
    title: event.title,
    description: event.description,
    startDatetime: event.start_datetime,
    endDatetime: event.end_datetime,
    durationMinutes: event.duration_minutes,
    placeName: event.place.name,
    placeAddress: event.place.address,
    pageUrl: `${siteOrigin}/events/${event.id}`,
  });

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${icsFilename(event.title)}"`,
      // The event can be edited (title, time, location…) after someone has
      // already downloaded this once — never let a CDN/browser serve a
      // stale copy of what is, structurally, always "the current state of
      // this event" rather than a versioned asset.
      "Cache-Control": "no-store",
    },
  });
}
