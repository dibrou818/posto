"use client";

import { useEffect, useRef, useState } from "react";
import { SaveButton } from "@/components/ui/SaveButton";

function InfoIcon() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 9.2v4" strokeLinecap="round" />
      <circle cx="10" cy="6.4" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** QR generator + preview for a place or an event: the target URL is always
 * `/places/<id>` or `/events/<id>` — keyed on the row's immutable id, so the
 * code stays valid for the life of that place/event no matter what its
 * owner edits afterwards. No auto-regeneration on save, by design: a
 * printed poster shouldn't silently point somewhere new. */
export function QrCodeSection({
  qrCodeUrl,
  publicPath,
  label,
  action,
}: {
  qrCodeUrl: string | null;
  publicPath: string;
  /** Always-visible caption under the code — "Renvoie vers la page de votre
   * lieu" / "... votre événement". Set by the caller since only it knows
   * which one this is; the fuller explanation (the "i" tooltip) is generic
   * enough to not need that distinction. */
  label: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Same click-outside-closes pattern as SearchBar/MapFilterButton's own
  // popovers — only listening while actually open, not on every render.
  useEffect(() => {
    if (!tooltipOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setTooltipOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [tooltipOpen]);

  // window is only ever read once this has actually hydrated and the
  // tooltip — closed by default — has been clicked open, so there's no
  // server/client markup mismatch to worry about here.
  const fullUrl = `${typeof window !== "undefined" ? window.location.origin : ""}${publicPath}`;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white">
        {qrCodeUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrCodeUrl} alt="Code QR" className="h-full w-full object-contain p-2" />
        ) : (
          <span className="px-2 text-center text-xs text-gray-400">Pas encore généré</span>
        )}
      </div>
      <div className="flex flex-col items-start gap-2">
        <div ref={tooltipRef} className="relative flex items-center gap-1.5">
          <p className="text-xs text-gray-500">{label}</p>
          <button
            type="button"
            onClick={() => setTooltipOpen((v) => !v)}
            aria-label="En savoir plus sur ce code QR"
            aria-expanded={tooltipOpen}
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
          >
            <InfoIcon />
          </button>
          {/* A tooltip bubble, not a modal — no backdrop, no focus trap,
              just a small popover that closes on an outside click (see the
              effect above) or picking it again. */}
          {tooltipOpen && (
            // z-50, not z-20: "fits inside the viewport" isn't the only way
            // a floating panel can end up hidden — this app's persistent
            // chrome (Header is z-40, BottomNav is z-30) sits *on top of*
            // ordinary page content by design, so a popover positioned
            // low/near either one at a lower z-index renders fully on
            // screen but literally behind that opaque bar, invisible
            // despite never crossing a viewport edge. Every transient
            // popover in this app (not the map's own full-screen overlay
            // system, which already runs at z-[1000]+) needs a z-index
            // above both — z-50 is the established value (see
            // LocationFilter) for exactly that.
            <div className="absolute top-full left-0 z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-white p-3 text-xs leading-relaxed text-gray-600 shadow-lg">
              Ce QR code renvoie vers{" "}
              <a href={fullUrl} className="font-medium break-all text-gray-900 underline">
                {fullUrl}
              </a>
              . Même si vous modifiez les informations de votre fiche plus tard, ce lien ne change
              pas — votre QR code reste valable, pas besoin de le réimprimer.
            </div>
          )}
        </div>
        <form action={action}>
          <SaveButton size="compact" savedLabel="Généré ✓" pendingLabel="Génération...">
            {qrCodeUrl ? "Régénérer le code QR" : "Générer le code QR"}
          </SaveButton>
        </form>
        {qrCodeUrl && (
          <a
            href={qrCodeUrl}
            download="code-qr.png"
            className="text-xs font-medium text-gray-700 underline transition-colors hover:text-gray-900"
          >
            Télécharger l&apos;image
          </a>
        )}
      </div>
    </div>
  );
}
