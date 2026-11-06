"use client";

import { ViewTransition } from "react";
import { useParams } from "next/navigation";

/** Same idea as the place page's loading state — see there. */
export default function Loading() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="posto-detail-page" role="status" aria-label="Chargement de la page">
      <span className="sr-only">Chargement…</span>
      <div aria-hidden="true">
        <ViewTransition name={`photo-event-${id}`} share="morph" default="none">
          <div className="posto-detail-hero posto-skeleton" />
        </ViewTransition>
        <div className="posto-detail-content pt-5"><div className="posto-skeleton h-8 w-2/3 rounded-xl" />
        <div className="posto-skeleton mt-3 h-4 w-1/2 rounded" />
        <div className="posto-skeleton mt-5 h-12 w-full rounded-2xl" /></div>
      </div>
    </div>
  );
}
