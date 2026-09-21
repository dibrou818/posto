"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function MapIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 4.5 4 6.5v13l5-2 6 2 5-2v-13l-5 2-6-2Z" />
      <path d="M9 4.5v13" />
      <path d="M15 6.5v13" />
    </svg>
  );
}

function UserIcon({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

function BookmarkIcon({ active }: { active: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}><path d="M6 4h12v17l-6-4-6 4V4Z" strokeLinejoin="round" /></svg>;
}

export function BottomNav({ user }: { user: User | null }) {
  const pathname = usePathname();
  // Same reasoning as Header's own early return — see there.
  if (pathname === "/landing" || pathname.startsWith("/dashboard")) return null;

  const items = [
    { href: "/", label: "Découvrir", icon: HomeIcon },
    { href: "/map", label: "Carte", icon: MapIcon },
    { href: "/favorites", label: "Favoris", icon: BookmarkIcon },
    { href: user ? "/account" : "/login", label: "Compte", icon: UserIcon },
  ];

  return (
    <nav
      // Extra padding on top of the device's own safe-area inset (which
      // already covers the home-indicator curve on modern iPhones/many
      // Android phones) — halved from 8px to 4px, the inset alone plus 8
      // more had the icons sitting further from the bottom edge than
      // actually made sense once compared against the curve it was meant
      // to clear.
      className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white pb-[calc(env(safe-area-inset-bottom)+4px)] md:hidden"
      aria-label="Navigation principale"
    >
      <div className="mx-auto flex max-w-6xl">
        {items.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              className="flex min-h-14 flex-1 flex-col gap-1 items-center justify-center transition-colors focus:outline-none focus-visible:bg-gray-50"
              aria-current={active ? "page" : undefined}
            >
              <span className={active ? "text-gray-900" : "text-gray-500"}>
                <Icon active={active} />
              </span>
              <span className={`text-[11px] ${active ? "font-semibold text-gray-900" : "text-gray-600"}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
