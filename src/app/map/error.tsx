"use client";

import { useEffect } from "react";

// Next.js's App Router convention: this file automatically becomes the
// error boundary for everything under /map (FullScreenMap, SearchBar,
// MapBottomSheet, the Map component itself...). Map.tsx already catches
// its own most likely failure (WebGL init) internally so it can offer a
// scoped, specific message right where the map would be — this is the
// broader safety net behind that: anything else that throws while
// rendering this route lands here instead of taking down the whole page
// with Next's generic crash screen.
export default function MapError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // No error-tracking service wired up in this app yet — console.error
    // at least keeps this visible in the browser/server logs instead of
    // vanishing silently.
    console.error("Erreur sur la page carte:", error);
  }, [error]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-3 bg-gray-50 px-6 text-center">
      <p className="text-sm font-medium text-gray-900">Une erreur est survenue en chargeant la carte</p>
      <p className="max-w-sm text-sm text-gray-500">
        Réessayez — si le problème persiste, revenez à l&apos;accueil et réessayez plus tard.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/30"
      >
        Réessayer
      </button>
    </div>
  );
}
