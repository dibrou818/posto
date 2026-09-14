"use client";

import { useState } from "react";
import { useIsMobileViewport } from "@/lib/viewport";

function ShareIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
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

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
    >
      <ShareIcon />
      {copied ? "Lien copié !" : "Partager"}
    </button>
  );
}
