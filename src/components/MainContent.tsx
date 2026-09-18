"use client";

import { usePathname } from "next/navigation";

// Split out of the root layout purely so this one thing (how much bottom
// padding <main> needs to clear BottomNav) can depend on the current route
// — a Server Component (what layout.tsx otherwise stays) has no built-in
// way to read the pathname the way this needs to. /landing hides BottomNav
// entirely (see BottomNav.tsx's own early return) specifically so a visitor
// there has no path back into the rest of the app; without this, they'd
// still see the empty gap BottomNav's padding normally reserves for it,
// even though there's nothing filling it anymore.
export function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/landing";

  return (
    <main
      className={`flex-1 flex flex-col ${isLanding ? "" : "pb-[calc(3.5rem+env(safe-area-inset-bottom)+4px)] md:pb-0"}`}
    >
      {children}
    </main>
  );
}
