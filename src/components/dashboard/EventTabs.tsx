import Link from "next/link";

export type EventTabKey = "infos" | "qr" | "affiche";

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-3.5 w-3.5 text-green-600" aria-hidden="true">
      <path d="M4 10.5 8 14.5 16 5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The three things you do with an event, side by side instead of stacked
 * down one long page: its information, its QR code, its poster. A real link
 * per tab (`?tab=`) so each is directly reachable from the events list —
 * and the checkmarks double as the "what's left to do" indicator. */
export function EventTabs({
  basePath,
  active,
  hasQr,
  hasPoster,
}: {
  basePath: string;
  active: EventTabKey;
  hasQr: boolean;
  hasPoster: boolean;
}) {
  const tabs: { key: EventTabKey; label: string; href: string; done: boolean }[] = [
    { key: "infos", label: "Informations", href: basePath, done: true },
    { key: "qr", label: "Code QR", href: `${basePath}?tab=qr`, done: hasQr },
    { key: "affiche", label: "Affiche", href: `${basePath}?tab=affiche`, done: hasPoster },
  ];

  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-gray-200" aria-label="Sections de l'événement">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`-mb-px inline-flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:bg-gray-50 ${
              isActive ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            {tab.label}
            {tab.key !== "infos" && tab.done && <CheckIcon />}
          </Link>
        );
      })}
    </nav>
  );
}
