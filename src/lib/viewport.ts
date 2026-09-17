"use client";

import { useEffect, useState } from "react";

// Same breakpoint as Tailwind's own `md`, and the rest of the app's mobile/
// desktop split (BottomNav, Map's marker-tap popup-vs-sheet choice,
// ShareButton's native-share-vs-copy choice).
export const MOBILE_BREAKPOINT_QUERY = "(max-width: 767px)";

export function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);
  return isMobile;
}
