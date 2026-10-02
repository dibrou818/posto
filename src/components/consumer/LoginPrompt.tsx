"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Small dialog shown when a signed-out visitor taps Suivre/Enregistrer:
 * says why an account is needed instead of silently redirecting to the
 * login page. Bottom sheet on mobile, centered card on desktop. */
export function LoginPrompt({
  title,
  description,
  onClose,
}: {
  title: string;
  description: string;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const primaryRef = useRef<HTMLAnchorElement>(null);
  const next = encodeURIComponent(pathname);

  useEffect(() => {
    primaryRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-prompt-title"
        className="w-full max-w-sm rounded-t-2xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl sm:pb-6"
      >
        <h2 id="login-prompt-title" className="text-lg font-semibold tracking-tight text-gray-900">
          {title}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{description}</p>
        <div className="mt-5 flex flex-col gap-2">
          <Link
            ref={primaryRef}
            href={`/login?next=${next}`}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            Se connecter
          </Link>
          <Link
            href={`/signup?next=${next}`}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
          >
            Créer un compte
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl px-5 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
