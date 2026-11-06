"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const CLOSE_AFTER_DRAG_PX = 90;

/** The app's one modal panel: a bottom sheet on phones (drag the handle down
 * to dismiss), a centred dialog on larger screens. Closes on Escape, on a
 * tap outside, and on the ✕. Rendered in a portal so it always sits above
 * the map controls and the bottom navigation. Mount it only while open. */
export function Sheet({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const { style } = document.body;
    const previous = style.overflow;
    style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      style.overflow = previous;
    };
  }, [onClose]);

  function onPointerDown(event: React.PointerEvent) {
    startY.current = event.clientY;
    setDragging(true);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Older WebViews: the drag still works, just less forgiving.
    }
  }
  function onPointerMove(event: React.PointerEvent) {
    if (dragging) setDragY(Math.max(event.clientY - startY.current, 0));
  }
  function onPointerUp() {
    if (!dragging) return;
    setDragging(false);
    if (dragY > CLOSE_AFTER_DRAG_PX) onClose();
    setDragY(0);
  }

  return createPortal(
    <div
      className="posto-fade-in fixed inset-0 z-[1300] flex items-end justify-center bg-black/40 md:items-center md:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="posto-sheet-in flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl focus:outline-none md:max-h-[80dvh] md:max-w-md md:rounded-2xl"
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragging ? "none" : "transform 200ms ease",
        }}
      >
        <div
          className="flex h-6 shrink-0 cursor-grab touch-none items-center justify-center md:hidden"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="h-1.5 w-10 rounded-full bg-gray-300" />
        </div>
        <div className="flex items-center justify-between gap-3 px-5 pt-1 pb-3 md:pt-5">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4" aria-hidden="true">
              <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-gray-100 bg-white px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
