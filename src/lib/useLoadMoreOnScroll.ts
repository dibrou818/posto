"use client";

import { useEffect, useRef } from "react";

/** Returns a ref to attach to a sentinel element (an empty div at the
 * bottom of a list) — once that element scrolls within `rootMargin` of the
 * viewport, `onIntersect` fires once. Re-arms itself automatically
 * whenever `enabled` flips back to true, which is the whole trick for
 * "infinite scroll": pass `hasMore && !loading` as `enabled` and the
 * observer naturally stops (no more to fetch) or pauses (a fetch is
 * already in flight) without any extra bookkeeping here. */
export function useLoadMoreOnScroll<T extends HTMLElement>(onIntersect: () => void, enabled: boolean) {
  const sentinelRef = useRef<T>(null);

  useEffect(() => {
    if (!enabled) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onIntersect();
      },
      // Starts the next fetch while the sentinel is still 400px below the
      // viewport — by the time someone actually scrolls that far, the next
      // page is already there instead of a visible pause once they arrive.
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, onIntersect]);

  return sentinelRef;
}
