"use client";

import { useCallback, useRef, useState, type CSSProperties, type PointerEvent } from "react";

// Same numbers as MapBottomSheet.tsx's own drag handling (tapping a map
// pin) — dragged down this far dismisses; how far up a fast drag is
// clamped so it can't fling the sheet off the top before the release
// check runs. Kept here instead of only inline so both call sites read the
// exact same values instead of two copies that could quietly drift apart.
const PEEK_TO_CLOSE_PX = 90;
const DRAG_UP_CLAMP_PX = -120;
const REST_CLAMP_PX = -40;

/** The drag physics behind every mobile bottom sheet in the app: slides up
 * from the bottom when `open`, and dragging the handle down past
 * PEEK_TO_CLOSE_PX dismisses it (calling `onClose`) — released short of
 * that threshold just snaps back. Written once for MapBottomSheet (tapping
 * a map pin); factored out here so a second sheet (the calendar provider
 * picker) gets the exact same feel from the exact same numbers, instead of
 * a hand-tuned near-copy that could drift out of sync over time.
 *
 * Returns pointer handlers to wire onto the drag handle, and `style` to
 * apply directly to the sheet's own root element — the caller owns
 * everything else (layout, content, backdrop). A caller that also needs
 * something extra on release (MapBottomSheet's own "drag up far enough
 * expands to the full page") isn't served by this hook and keeps its own
 * from-scratch pointer handling instead — see MapBottomSheet. */
export function useDragToDismissSheet(open: boolean, onClose: () => void) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartYRef = useRef(0);

  const handlePointerDown = useCallback((e: PointerEvent) => {
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
  }, []);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragging) return;
      setDragY(Math.max(e.clientY - dragStartYRef.current, DRAG_UP_CLAMP_PX));
    },
    [dragging],
  );

  const handlePointerUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    if (dragY > PEEK_TO_CLOSE_PX) onClose();
    setDragY(0);
  }, [dragging, dragY, onClose]);

  const style: CSSProperties = {
    transform: open ? `translateY(${Math.max(dragY, REST_CLAMP_PX)}px)` : "translateY(100%)",
    transition: dragging ? "none" : "transform 240ms ease",
  };

  return { dragging, handlePointerDown, handlePointerMove, handlePointerUp, style };
}
