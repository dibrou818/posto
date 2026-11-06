"use client";

import { useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import type { MapSheetItem } from "@/components/Map";
import { getOpenStatus, formatOpenStatus } from "@/lib/opening-hours";
import { formatEventDateBadge } from "@/lib/eventSchedule";
import { CalendarKindIcon, PlaceKindIcon } from "@/components/KindIcon";

type Snap = "peek" | "half" | "full";
const SNAPS: Snap[] = ["peek", "half", "full"];
// Heights as a share of the map area; "peek" is just the handle + count.
const PEEK_PX = 60;
const SNAP_FRACTION: Record<Exclude<Snap, "peek">, number> = { half: 0.45, full: 0.78 };

function itemKey(item: MapSheetItem) {
  return item.kind === "place" ? `place-${item.place.id}` : `event-${item.event.id}`;
}

function Row({ item, onSelect }: { item: MapSheetItem; onSelect: (item: MapSheetItem) => void }) {
  const isPlace = item.kind === "place";
  const photo = isPlace ? item.place.cover_photo_url : (item.event.cover_photo_url ?? item.event.place.cover_photo_url);
  const title = isPlace ? item.place.name : item.event.title;

  let detail: string;
  if (isPlace) {
    const hasHours = item.place.opening_hours.some((hour) => hour.zone_name === null);
    detail = hasHours ? formatOpenStatus(getOpenStatus(item.place.opening_hours)) : (item.place.address ?? "");
  } else {
    detail = `${formatEventDateBadge(item.event.start_datetime)} · ${item.event.place.name}`;
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(item)}
        className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
      >
        <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100 text-gray-500">
          {photo ? (
            <Image src={photo} alt="" fill sizes="56px" className="object-cover" />
          ) : isPlace ? (
            <PlaceKindIcon />
          ) : (
            <CalendarKindIcon />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="shrink-0 text-gray-500">
              {isPlace ? <PlaceKindIcon /> : <CalendarKindIcon />}
            </span>
            <span className="truncate text-base font-semibold text-gray-900">{title}</span>
          </span>
          <span className="block truncate text-sm text-gray-600">{detail}</span>
        </span>
      </button>
    </li>
  );
}

/** What's on the map "around here": a bottom sheet with three heights on
 * phones and tablets (handle only, half, nearly full — drag or tap the
 * handle), a side panel on wide screens. Tapping a row flies the map to it
 * and opens its preview. Hidden while a pin's own preview is showing. */
export function MapResultsSheet({
  items,
  hidden,
  onSelect,
}: {
  items: MapSheetItem[];
  hidden: boolean;
  onSelect: (item: MapSheetItem) => void;
}) {
  const [snap, setSnap] = useState<Snap>("peek");
  const [drag, setDrag] = useState<{ startY: number; startHeight: number; height: number; areaHeight: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  function heightFor(target: Snap, areaHeight: number) {
    return target === "peek" ? PEEK_PX : Math.round(areaHeight * SNAP_FRACTION[target]);
  }
  const areaHeight = () => rootRef.current?.parentElement?.clientHeight ?? 600;

  function onPointerDown(event: React.PointerEvent) {
    const area = areaHeight();
    const startHeight = heightFor(snap, area);
    setDrag({ startY: event.clientY, startHeight, height: startHeight, areaHeight: area });
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Drag still works without capture.
    }
  }
  function onPointerMove(event: React.PointerEvent) {
    if (!drag) return;
    const next = drag.startHeight + (drag.startY - event.clientY);
    setDrag({ ...drag, height: Math.min(Math.max(next, PEEK_PX), Math.round(drag.areaHeight * SNAP_FRACTION.full)) });
  }
  function onPointerUp(event: React.PointerEvent) {
    if (!drag) return;
    const moved = Math.abs(event.clientY - drag.startY);
    if (moved < 6) {
      // A tap on the handle: step to the next height, back to the handle after the last.
      setSnap(SNAPS[(SNAPS.indexOf(snap) + 1) % SNAPS.length]);
    } else {
      const nearest = SNAPS.reduce((best, candidate) =>
        Math.abs(heightFor(candidate, drag.areaHeight) - drag.height) < Math.abs(heightFor(best, drag.areaHeight) - drag.height)
          ? candidate
          : best,
      );
      setSnap(nearest);
    }
    setDrag(null);
  }

  const style = {
    "--sheet-h": drag
      ? `${drag.height}px`
      : snap === "peek"
        ? `${PEEK_PX}px`
        : `${SNAP_FRACTION[snap] * 100}%`,
    transition: drag ? "none" : "height 260ms cubic-bezier(0.32, 0.72, 0, 1), transform 200ms ease",
  } as CSSProperties;

  const count = items.length;
  const title = count === 0 ? "Aucun résultat ici" : `${count} résultat${count > 1 ? "s" : ""} ici`;
  const expanded = snap !== "peek";

  return (
    <div
      ref={rootRef}
      aria-hidden={hidden}
      className={`pointer-events-auto absolute inset-x-0 bottom-0 z-[900] flex h-[var(--sheet-h)] flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.14)] lg:inset-x-auto lg:top-3 lg:bottom-3 lg:left-3 lg:h-auto lg:w-80 lg:rounded-2xl lg:shadow-lg ${
        hidden ? "pointer-events-none translate-y-full lg:translate-y-0 lg:opacity-0" : ""
      }`}
      style={style}
    >
      <div
        className="flex h-[60px] shrink-0 cursor-grab touch-none flex-col items-center justify-center gap-1 lg:h-auto lg:cursor-default lg:items-start lg:px-4 lg:pt-4 lg:pb-1"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span className="h-1.5 w-10 rounded-full bg-gray-300 lg:hidden" />
        <span className="text-sm font-semibold text-gray-900">{title}</span>
      </div>
      <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3 ${expanded ? "" : "invisible lg:visible"}`}>
        {count === 0 ? (
          <p className="px-3 py-4 text-sm text-gray-500">
            Déplacez la carte, ou élargissez les filtres pour voir plus de résultats.
          </p>
        ) : (
          <ul className="flex flex-col">
            {items.map((item) => (
              <Row key={itemKey(item)} item={item} onSelect={onSelect} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
