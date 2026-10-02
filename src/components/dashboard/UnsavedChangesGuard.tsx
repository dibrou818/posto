"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** Warns before leaving a form with unsaved edits — on closing the tab or
 * reloading, and on tapping any link in the app (the menu, a tab, "retour").
 * Drop it inside a `<form>`; it watches that form's fields, and goes quiet
 * again once the form is submitted. The in-app prompt is a real dialog, not
 * the browser's popup. */
export function UnsavedChangesGuard() {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const router = useRouter();
  const [dirty, setDirty] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    const form = anchorRef.current?.closest("form");
    if (!form) return;
    const markDirty = () => setDirty(true);
    const markClean = () => setDirty(false);
    form.addEventListener("input", markDirty);
    form.addEventListener("change", markDirty);
    form.addEventListener("submit", markClean);
    return () => {
      form.removeEventListener("input", markDirty);
      form.removeEventListener("change", markDirty);
      form.removeEventListener("submit", markClean);
    };
  }, []);

  useEffect(() => {
    if (!dirty) return;
    function beforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    function interceptLinks(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const link = (event.target as HTMLElement | null)?.closest("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(url.pathname + url.search + url.hash);
    }
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", interceptLinks, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", interceptLinks, true);
    };
  }, [dirty]);

  return (
    <>
      <span ref={anchorRef} hidden />
      {pendingHref && (
        <div role="alertdialog" aria-modal="true" aria-label="Modifications non enregistrées" className="fixed inset-0 z-[60] flex items-end justify-center bg-black/35 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold text-gray-900">Quitter sans enregistrer ?</h2>
            <p className="mt-1 text-sm text-gray-500">Vos modifications sur cette page seront perdues.</p>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  const href = pendingHref;
                  setPendingHref(null);
                  setDirty(false);
                  router.push(href);
                }}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium text-gray-900 hover:bg-gray-50"
              >
                Quitter sans enregistrer
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => setPendingHref(null)}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800"
              >
                Rester sur la page
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
