"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

type Point = { x: number; y: number };
const HISTORY_KEY = "posto-place-gallery";

function CloseIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" /></svg>;
}

function ArrowIcon({ right = false }: { right?: boolean }) {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d={right ? "m9 5 7 7-7 7" : "m15 5-7 7 7 7"} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function PhotoPlaceholder({ compact = false }: { compact?: boolean }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-gray-100 text-center">
      <div className="flex flex-col items-center gap-2 text-gray-500">
        <svg viewBox="0 0 24 24" className={compact ? "h-6 w-6" : "h-9 w-9"} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="8.5" cy="9" r="1.5" /><path d="m5 18 5-5 3 3 2-2 4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {!compact && <span className="text-sm font-medium">Photos à venir</span>}
      </div>
    </div>
  );
}

export function PlacePhotoGallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const start = useRef<Point>({ x: 0, y: 0 });
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const lastTap = useRef(0);

  const goTo = useCallback((next: number) => {
    setIndex(Math.min(Math.max(next, 0), photos.length - 1));
    setOffset({ x: 0, y: 0 });
    setZoomed(false);
  }, [photos.length]);

  const finishClose = useCallback(() => {
    setOpen(false);
    setOffset({ x: 0, y: 0 });
    setZoomed(false);
    requestAnimationFrame(() => openerRef.current?.focus());
  }, []);

  const close = useCallback(() => {
    if (window.history.state?.[HISTORY_KEY]) window.history.back();
    else finishClose();
  }, [finishClose]);

  function openAt(next: number, trigger: HTMLButtonElement) {
    openerRef.current = trigger;
    setIndex(next);
    setOpen(true);
    window.history.pushState({ ...window.history.state, [HISTORY_KEY]: true }, "", `${window.location.pathname}${window.location.search}#photos`);
  }

  useEffect(() => {
    const onPopState = () => finishClose();
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [finishClose]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    for (const adjacent of [photos[index - 1], photos[index + 1]]) {
      if (adjacent) { const preload = new window.Image(); preload.src = adjacent; }
    }
  }, [index, open, photos]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      else if (event.key === "ArrowLeft") goTo(index - 1);
      else if (event.key === "ArrowRight") goTo(index + 1);
      else if (event.key === "Tab") {
        const controls = dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])");
        if (!controls?.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close, goTo, index, open]);

  function markFailed(url: string) {
    setFailed((current) => new Set(current).add(url));
  }

  function tile(url: string, photoIndex: number, className: string, sizes: string, priority = false, overlay?: string) {
    return (
      <button key={url} type="button" onClick={(event) => openAt(photoIndex, event.currentTarget)} className={`group relative overflow-hidden bg-gray-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-white/80 ${className}`} aria-label={`Ouvrir la photo ${photoIndex + 1} sur ${photos.length}`}>
        {failed.has(url) ? <PhotoPlaceholder compact /> : <Image src={url} alt={`${alt} — photo ${photoIndex + 1}`} fill sizes={sizes} priority={priority} className="object-cover" onError={() => markFailed(url)} />}
        {overlay && <span className="absolute inset-0 grid place-items-center bg-black/45 px-1 text-center text-sm font-semibold text-on-accent tabular-nums backdrop-blur-[1px] sm:text-base">{overlay}</span>}
      </button>
    );
  }

  const mobileVisible = Math.min(photos.length, 4);
  const desktopVisible = Math.min(photos.length, 5);

  return (
    <>
      <div className="absolute inset-0">
        {photos.length === 0 ? <PhotoPlaceholder /> : photos.length === 1 ? tile(photos[0], 0, "h-full w-full", "(max-width: 639px) 100vw, 864px", true) : (
          <>
            <div className="grid h-full grid-cols-[minmax(0,2.05fr)_minmax(0,1fr)] gap-1 sm:hidden">
              {tile(photos[0], 0, "h-full", "68vw", true)}
              <div className={`grid min-w-0 gap-1 ${mobileVisible === 2 ? "grid-rows-1" : mobileVisible === 3 ? "grid-rows-2" : "grid-rows-3"}`}>
                {photos.slice(1, mobileVisible).map((url, i) => tile(url, i + 1, "h-full", "32vw", false, i === mobileVisible - 2 && photos.length > mobileVisible ? `+${photos.length - mobileVisible} photos` : undefined))}
              </div>
            </div>
            <div className="hidden h-full grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] gap-1 sm:grid">
              {tile(photos[0], 0, "h-full", "520px", true)}
              <div className={`grid min-w-0 gap-1 ${desktopVisible === 2 ? "grid-cols-1" : desktopVisible <= 4 ? `grid-cols-1 ${desktopVisible === 3 ? "grid-rows-2" : "grid-rows-3"}` : "grid-cols-2 grid-rows-2"}`}>
                {photos.slice(1, desktopVisible).map((url, i) => tile(url, i + 1, "h-full", "220px", false, i === desktopVisible - 2 && photos.length > desktopVisible ? `+${photos.length - desktopVisible} photos` : undefined))}
              </div>
            </div>
          </>
        )}
      </div>

      {open && (
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`Galerie photos de ${alt}`} tabIndex={-1} className="posto-fade-in fixed inset-0 z-[2000] flex flex-col overflow-hidden bg-black text-white outline-none" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="absolute inset-x-0 top-[env(safe-area-inset-top)] z-20 flex h-16 items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4">
            <span className="rounded-full bg-black/35 px-3 py-1.5 text-sm font-medium backdrop-blur-md">{index + 1} / {photos.length}</span>
            <button ref={closeButtonRef} type="button" onClick={close} className="grid h-11 w-11 place-items-center rounded-full bg-black/45 backdrop-blur-md transition-colors hover:bg-black/65 focus:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="Fermer la galerie"><CloseIcon /></button>
          </div>

          <div
            className="relative min-h-0 flex-1 touch-none select-none"
            onPointerDown={(event) => { start.current = { x: event.clientX, y: event.clientY }; setDragging(true); event.currentTarget.setPointerCapture(event.pointerId); }}
            onPointerMove={(event) => { if (!dragging || zoomed) return; const x = event.clientX - start.current.x; const y = Math.max(0, event.clientY - start.current.y); setOffset(Math.abs(y) > Math.abs(x) ? { x: 0, y } : { x, y: 0 }); }}
            onPointerUp={() => { if (offset.y > 110) close(); else if (offset.x < -70) goTo(index + 1); else if (offset.x > 70) goTo(index - 1); else setOffset({ x: 0, y: 0 }); setDragging(false); }}
            onPointerCancel={() => { setDragging(false); setOffset({ x: 0, y: 0 }); }}
          >
            <div
              className="absolute inset-0 will-change-transform"
              style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoomed ? 2 : 1})`, opacity: offset.y ? Math.max(.35, 1 - offset.y / 420) : 1, transition: dragging ? "none" : "transform 280ms cubic-bezier(.22,.8,.22,1), opacity 220ms ease" }}
              onClick={() => { const now = Date.now(); if (now - lastTap.current < 280) setZoomed((value) => !value); lastTap.current = now; }}
            >
              {failed.has(photos[index]) ? <PhotoPlaceholder /> : <Image src={photos[index]} alt={`${alt} — photo ${index + 1}`} fill sizes="100vw" priority className="object-contain" onError={() => markFailed(photos[index])} />}
            </div>
          </div>

          {photos.length > 1 && <>
            <button type="button" disabled={index === 0} onClick={() => goTo(index - 1)} className="absolute left-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-black/45 backdrop-blur-md hover:bg-black/65 disabled:opacity-0 md:grid" aria-label="Photo précédente"><ArrowIcon /></button>
            <button type="button" disabled={index === photos.length - 1} onClick={() => goTo(index + 1)} className="absolute right-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-black/45 backdrop-blur-md hover:bg-black/65 disabled:opacity-0 md:grid" aria-label="Photo suivante"><ArrowIcon right /></button>
          </>}
        </div>
      )}
    </>
  );
}
