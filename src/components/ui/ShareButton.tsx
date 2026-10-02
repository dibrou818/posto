"use client";

import { useState } from "react";
import { useIsMobileViewport } from "@/lib/viewport";

function ShareIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-[18px] w-[18px]" aria-hidden="true">
      <path d="M10 3v10" strokeLinecap="round" />
      <path d="M6.5 6.5 10 3l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 10v4.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Share a place or event page: on mobile, opens the device's native share
 * sheet (Messages, WhatsApp, Instagram...) via the Web Share API, with
 * `text` (name/date/address — built by the caller, see lib/share.ts) plus
 * the page's link appended on its own line, which is what lets most share
 * targets auto-linkify/preview it. On desktop, the native sheet is skipped
 * even where the browser technically supports it (macOS Safari/some Chrome
 * builds do) — for a "share this link" click at a desk, copying straight to
 * the clipboard is the faster, more expected action; the OS share sheet
 * there is built for a completely different, rarer flow (AirDrop, Mail...).
 * The clipboard fallback also covers any mobile browser without Web Share
 * support. */
export function ShareButton({ title, text }: { title: string; text: string }) {
  const isMobile = useIsMobileViewport();
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;

    if (isMobile && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: `${text}\n\n${url}` });
      } catch {
        // User cancelled the native sheet, or the platform refused — either
        // way there's nothing useful to recover from here.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // No Clipboard API either — nothing left to fall back to.
    }
  }

  // Icon-only round button meant to sit over the top-right corner of a
  // page's hero photo, mirroring the BackButton on the left. The copied
  // confirmation is a small floating label so the button never changes size.
  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleShare}
        aria-label="Partager"
        title="Partager"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
      >
        <ShareIcon />
      </button>
      {copied && (
        <span
          role="status"
          className="absolute top-full right-0 mt-1.5 whitespace-nowrap rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white shadow"
        >
          Lien copié
        </span>
      )}
    </div>
  );
}
