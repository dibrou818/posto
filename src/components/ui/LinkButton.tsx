import Link from "next/link";
import type { ReactNode } from "react";

type Icon = "back" | "external" | "forward";

function ChevronLeft() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path d="M12 4 6 10l6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path d="m8 4 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path d="M8 5H5.5A1.5 1.5 0 0 0 4 6.5v8A1.5 1.5 0 0 0 5.5 16h8a1.5 1.5 0 0 0 1.5-1.5V12M11 4h5v5M16 4l-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A navigation link that looks (and is sized) like a button — for "go
 * back", "see the public page", "next step" — instead of a bare underlined
 * line of text that doesn't read as clickable. `outline` is the default
 * (white, bordered); `solid` is for the one obvious next action. External
 * links open in a new tab and show the matching icon automatically. */
export function LinkButton({
  href,
  children,
  icon,
  variant = "outline",
  className = "",
}: {
  href: string;
  children: ReactNode;
  icon?: Icon;
  variant?: "outline" | "solid";
  className?: string;
}) {
  const external = icon === "external";
  const style =
    variant === "solid"
      ? "border-gray-900 bg-gray-900 text-white hover:bg-gray-800"
      : "border-gray-300 bg-white text-gray-900 hover:bg-gray-50";
  return (
    <Link
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 ${style} ${className}`.trim()}
    >
      {icon === "back" && <ChevronLeft />}
      {children}
      {icon === "forward" && <ChevronRight />}
      {external && <ExternalIcon />}
    </Link>
  );
}
