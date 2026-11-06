"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Downloads the map's code (maplibre is the heaviest chunk of the app) once
 * the browser is idle on any other page, so opening the Carte tab only has
 * to fetch its data and tiles, not the whole map library too. Renders
 * nothing; skipped on the map itself and in the pro dashboard. */
export function MapWarmup() {
  const pathname = usePathname();
  const skip = pathname === "/map" || pathname.startsWith("/dashboard");

  useEffect(() => {
    if (skip) return;
    const warm = () => void import("@/components/Map");
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(warm, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(warm, 2000);
    return () => clearTimeout(id);
  }, [skip]);

  return null;
}
