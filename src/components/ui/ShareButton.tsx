"use client";

import { useState } from "react";

function ShareIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
      <path d="M10 3v10" strokeLinecap="round" />
      <path d="M6.5 6.5 10 3l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 10v4.5a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Opens the device's native share sheet (Messages, Mail, Instagram, etc.)
 * via the Web Share API — supported on iOS/Android/most modern browsers.
 * Where it isn't available (mainly desktop), falls back to copying the
 * link, with a brief "Lien copié !" confirmation instead of failing silently. */
export function ShareButton({ title, text }: { title: string; text?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
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
      // No Web Share API and no Clipboard API — nothing left to fall back to.
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
