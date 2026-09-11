"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { MapSheetItem } from "@/components/Map";
import type { PlaceWithRelations } from "@/lib/queries";
import { isOpenNow } from "@/lib/opening-hours";

const eventDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

// Mirrors Map.tsx's marker/popup violet, so the sheet reads as the same
// object as the pin the user just tapped.
const EVENT_COLOR = "#7c3aed";

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-6.5-7-11.5a7 7 0 0 1 14 0C19 14.5 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.2" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </svg>
  );
}

function hrefFor(item: MapSheetItem): string {
  return item.kind === "place" ? `/places/${item.place.id}` : `/events/${item.event.id}`;
}

function PlaceBadge({ place }: { place: PlaceWithRelations }) {
  const open = isOpenNow(place.opening_hours);
  return (
    <span
      className={`flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        open ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${open ? "bg-green-500" : "bg-red-500"}`} />
      {open ? "Ouvert" : "Fermé"}
    </span>
  );
}

function SheetContent({ item }: { item: MapSheetItem }) {
  const coverPhotoUrl =
    item.kind === "place" ? item.place.cover_photo_url : (item.event.cover_photo_url ?? item.event.place.cover_photo_url);
  const title = item.kind === "place" ? item.place.name : item.event.title;
  const subtitle = item.kind === "place" ? item.place.address : item.event.place.name;

  return (
    <div className="flex flex-col gap-2">
      {coverPhotoUrl && (
        <div className="relative h-28 w-full shrink-0 overflow-hidden bg-gray-100">
          <Image src={coverPhotoUrl} alt="" fill sizes="480px" className="object-cover" />
        </div>
      )}
      <div className="flex flex-col gap-2 px-4 pt-1">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {subtitle && (
          <p className="flex items-center gap-1.5 overflow-hidden text-sm text-gray-500">
            <span className="shrink-0 text-gray-400">
              <PinIcon />
            </span>
            <span className="truncate">{subtitle}</span>
          </p>
        )}
        {item.kind === "place" ? (
          <PlaceBadge place={item.place} />
        ) : (
          <span
            className="flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ background: "#ede9fe", color: EVENT_COLOR }}
          >
            <CalendarIcon />
            {eventDateFormatter.format(new Date(item.event.start_datetime))}
          </span>
        )}
      </div>
    </div>
  );
}

const PEEK_TO_CLOSE_PX = 90; // dragged down this far -> dismiss
const PEEK_TO_OPEN_PX = -70; // dragged up this far -> open the full page

/** Mobile-only preview card that slides up from the bottom when a map pin
 * is tapped — the bottom-sheet pattern from Google Maps et al. Dragging the
 * handle down dismisses it; dragging it up past a threshold, or tapping the
 * card, navigates to the place/event's real page (the "whole page" this
 * opens is the existing /places/[id] or /events/[id] route, not a
 * re-implementation of it here). Desktop keeps the plain Leaflet popup
 * instead (see Map.tsx) — this stays mounted but visually off-screen
 * whenever there's no selection. */
export function MapBottomSheet({ item, onClose }: { item: MapSheetItem | null; onClose: () => void }) {
  const router = useRouter();
  // Keeps showing the last item's content while the close animation plays,
  // instead of the sheet visibly going blank a beat before it slides away.
  // Adjusted during render (React's documented pattern for "remember the
  // last non-null prop") rather than in an effect, which would commit a
  // blank frame first and then a second render right behind it.
  const [content, setContent] = useState<MapSheetItem | null>(item);
  const [prevItem, setPrevItem] = useState(item);
  if (item !== prevItem) {
    setPrevItem(item);
    if (item) setContent(item);
  }

  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartYRef = useRef(0);

  const open = item !== null;

  function handlePointerDown(e: React.PointerEvent) {
    dragStartYRef.current = e.clientY;
    setDragging(true);
    // Keeps receiving move/up events even if the finger/cursor strays off
    // the (fairly small) handle mid-drag. Guarded: some older WebViews
    // don't support pointer capture, or can reject a given pointerId — the
    // drag still works without it, just less forgiving about staying
    // exactly on the handle.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // no-op — see above
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    // Clamped upward so a wild fast drag doesn't fling the card off the top
    // of the screen before the threshold check gets a chance to run on
    // release — downward is unclamped, it can be dragged fully off-screen.
    setDragY(Math.max(e.clientY - dragStartYRef.current, -120));
  }

  function handlePointerUp() {
    if (!dragging) return;
    setDragging(false);
    if (dragY < PEEK_TO_OPEN_PX && content) {
      router.push(hrefFor(content));
      onClose();
    } else if (dragY > PEEK_TO_CLOSE_PX) {
      onClose();
    }
    setDragY(0);
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[1200] flex justify-center md:hidden" aria-hidden={!open}>
      <div
        className="pointer-events-auto w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.18)]"
        style={{
          transform: open ? `translateY(${Math.max(dragY, -40)}px)` : "translateY(100%)",
          transition: dragging ? "none" : "transform 240ms ease",
        }}
      >
        {/* Drag handle: a 36px-tall hit area even though the visible bar is
            thin, so it's a comfortable touch target on its own. */}
        <div
          className="flex h-9 w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <span className="h-1.5 w-10 rounded-full bg-gray-300" />
        </div>

        {content && (
          <button type="button" onClick={() => router.push(hrefFor(content))} className="flex w-full flex-col gap-3 pb-4 text-left">
            <SheetContent item={content} />
            <span className="mx-4 block rounded-lg bg-gray-900 py-2.5 text-center text-sm font-semibold text-white">
              {content.kind === "event" ? "Voir l'événement" : "Voir la fiche"}
            </span>
          </button>
        )}
        <div className="pb-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}
