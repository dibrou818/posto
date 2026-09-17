"use client";

import { useEffect, useState } from "react";

/** Returns a ref-callback to attach to a sentinel element (an empty div at
 * the bottom of a list) — once that element scrolls within `rootMargin` of
 * the viewport, `onIntersect` fires once. Re-arms itself automatically
 * whenever `enabled` flips back to true, which is the whole trick for
 * "infinite scroll": pass `hasMore && !loading` as `enabled` and the
 * observer naturally stops (no more to fetch) or pauses (a fetch is
 * already in flight) without any extra bookkeeping here.
 *
 * State, not a plain `useRef`, is what holds the DOM node: a plain ref's
 * `.current` can change (a section mounting for the first time after the
 * user switches tabs, e.g. Lieux/Événements/Tout on the home page) without
 * that ever being visible to `useEffect`'s dependency array, since writing
 * to a ref doesn't trigger a re-render. That silently left this exact
 * scenario — switch to a tab whose sentinel had never existed before,
 * `enabled` already true from the very first render so the effect never
 * reruns — with no IntersectionObserver ever attached, so "Voir plus"
 * variant sections could look like infinite scroll had simply stopped
 * working past the first page. A callback ref stored in state re-renders
 * on every mount/unmount of the node, which is exactly the signal this
 * effect needs alongside `enabled` itself. */
export function useLoadMoreOnScroll<T extends HTMLElement>(onIntersect: () => void, enabled: boolean) {
  const [sentinel, setSentinel] = useState<T | null>(null);

  useEffect(() => {
    if (!enabled || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onIntersect();
      },
      // Starts the next fetch while the sentinel is still 400px below the
      // viewport — by the time someone actually scrolls that far, the next
      // page is already there instead of a visible pause once they arrive.
      { rootMargin: "400px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [enabled, sentinel, onIntersect]);

  return setSentinel;
}
