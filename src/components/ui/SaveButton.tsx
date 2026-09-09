"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass } from "@/lib/ui";

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M4 10.5 8 14.5 16 5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Submit button for a `<form action={serverAction}>`: shows "..." while the
 * action is in flight (via useFormStatus, so it works with plain server
 * actions — no need to touch their signature), then flashes a "✓ Enregistré"
 * confirmation for a couple seconds once it completes. Every dashboard form
 * saves independently, so without this a click gave no feedback at all. */
export function SaveButton({
  children,
  savedLabel = "Enregistré",
  pendingLabel = "Enregistrement...",
  disabled = false,
  size = "default",
  className = "",
}: {
  children: ReactNode;
  savedLabel?: string;
  pendingLabel?: string;
  disabled?: boolean;
  size?: "default" | "compact";
  className?: string;
}) {
  const { pending } = useFormStatus();
  const [justSaved, setJustSaved] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (pending) {
      wasPending.current = true;
      return;
    }
    if (!wasPending.current) return;
    wasPending.current = false;
    setJustSaved(true);
    const timer = setTimeout(() => setJustSaved(false), 2500);
    return () => clearTimeout(timer);
  }, [pending]);

  return (
    <span className="inline-flex items-center gap-2">
      <button type="submit" disabled={disabled || pending} className={buttonClass(size, className)}>
        {pending ? pendingLabel : children}
      </button>
      {justSaved && (
        <span className="flex items-center gap-1 text-sm font-medium text-green-600">
          <CheckIcon />
          {savedLabel}
        </span>
      )}
    </span>
  );
}
