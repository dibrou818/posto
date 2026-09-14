"use client";

import { useRef, useState } from "react";
import Image from "next/image";

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={direction === "left" ? "M15 5 8 12l7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

const ARROW_BUTTON_CLASS =
  "absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70";

/** Fills its parent (a `relative h-64 ...` box on the place page) with a
 * swipeable photo carousel — arrow buttons for desktop, a one-finger drag
 * for mobile, both driving the same `index` state so they always agree
 * on position. Renders nothing for zero photos, and a single plain image
 * (no arrows/dots/touch handling to fight over one photo) for exactly one. */
export function PhotoCarousel({ photos, alt }: { photos: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  if (photos.length === 0) return null;

  function goTo(next: number) {
    setIndex(Math.min(Math.max(next, 0), photos.length - 1));
  }

  function handleTouchStart(e: React.TouchEvent) {
    dragStartX.current = e.touches[0].clientX;
    setDragging(true);
  }

  function handleTouchMove(e: React.TouchEvent) {
    const delta = e.touches[0].clientX - dragStartX.current;
    // Past the first/last photo, the drag still tracks the finger but at a
    // third speed — a soft "rubber band" resistance instead of a hard wall,
    // so it's obvious there's nothing further that way without the image
    // just refusing to move at all.
    const pastEnd = (index === 0 && delta > 0) || (index === photos.length - 1 && delta < 0);
    setDragOffset(pastEnd ? delta / 3 : delta);
  }

  function handleTouchEnd() {
    const width = containerRef.current?.offsetWidth ?? 1;
    const threshold = width * 0.2;
    if (dragOffset < -threshold) goTo(index + 1);
    else if (dragOffset > threshold) goTo(index - 1);
    setDragging(false);
    setDragOffset(0);
  }

  if (photos.length === 1) {
    return <Image src={photos[0]} alt={alt} fill sizes="768px" className="object-cover" priority />;
  }

  return (
    <div ref={containerRef} className="absolute inset-0 touch-pan-y select-none">
      <div
        className="flex h-full"
        style={{
          transform: `translateX(calc(${-index * 100}% + ${dragOffset}px))`,
          transition: dragging ? "none" : "transform 300ms ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {photos.map((url, i) => (
          <div key={url} className="relative h-full w-full shrink-0">
            <Image src={url} alt={`${alt} — photo ${i + 1}`} fill sizes="768px" className="object-cover" priority={i === 0} />
          </div>
        ))}
      </div>

      {index > 0 && (
        <button type="button" onClick={() => goTo(index - 1)} aria-label="Photo précédente" className={`${ARROW_BUTTON_CLASS} left-2`}>
          <ChevronIcon direction="left" />
        </button>
      )}
      {index < photos.length - 1 && (
        <button type="button" onClick={() => goTo(index + 1)} aria-label="Photo suivante" className={`${ARROW_BUTTON_CLASS} right-2`}>
          <ChevronIcon direction="right" />
        </button>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5">
        {photos.map((_, i) => (
          <span key={i} className={`h-1.5 w-1.5 rounded-full transition-colors ${i === index ? "bg-white" : "bg-white/50"}`} />
        ))}
      </div>
    </div>
  );
}
