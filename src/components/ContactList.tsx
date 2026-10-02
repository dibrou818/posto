import type { ReactNode } from "react";

type ContactSource = {
  phone: string | null;
  website_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
};

const iconProps = { viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 1.6, className: "h-[18px] w-[18px]", "aria-hidden": true } as const;

const ICONS = {
  phone: (
    <svg {...iconProps}>
      <path d="M4.2 2.8h2.6l1.4 3.6-1.7 1.1a9 9 0 0 0 4.1 4.1l1.1-1.7 3.6 1.4v2.6a1.6 1.6 0 0 1-1.7 1.6A11.9 11.9 0 0 1 2.6 4.5 1.6 1.6 0 0 1 4.2 2.8Z" strokeLinejoin="round" />
    </svg>
  ),
  web: (
    <svg {...iconProps}>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M2.5 10h15M10 2.5a11 11 0 0 1 3 7.5 11 11 0 0 1-3 7.5 11 11 0 0 1-3-7.5 11 11 0 0 1 3-7.5Z" />
    </svg>
  ),
  instagram: (
    <svg {...iconProps}>
      <rect x="2.5" y="2.5" width="15" height="15" rx="4" />
      <circle cx="10" cy="10" r="3.6" />
      <circle cx="14.2" cy="5.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  ),
  facebook: (
    <svg {...iconProps}>
      <path d="M12.5 6.5h-1.3c-.9 0-1.2.4-1.2 1.2v1.8h2.4l-.3 2.4h-2.1v6.1H7.4v-6.1H5.5V9.5h1.9V7.4c0-2 1.1-3.4 3.2-3.4h1.9v2.5Z" />
    </svg>
  ),
};

function Row({ href, icon, label, value, external }: { href: string; icon: ReactNode; label: string; value: string; external?: boolean }) {
  return (
    <li>
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="flex min-h-12 items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 focus:outline-none focus-visible:bg-gray-50"
      >
        <span className="text-gray-500">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-gray-500">{label}</span>
          <span className="block truncate font-medium text-gray-900">{value}</span>
        </span>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true">
          <path d="M7.5 4.5 13 10l-5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </li>
  );
}

function hostLabel(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** "Contact" block of a place/event page: phone, website and social links as
 * one tidy list instead of a row of loose buttons at the top of the page.
 * Renders nothing when the place has no contact details at all. */
export function ContactList({ place }: { place: ContactSource }) {
  const rows: ReactNode[] = [];
  if (place.phone) rows.push(<Row key="phone" href={`tel:${place.phone}`} icon={ICONS.phone} label="Téléphone" value={place.phone} />);
  if (place.website_url) rows.push(<Row key="web" href={place.website_url} icon={ICONS.web} label="Site web" value={hostLabel(place.website_url)} external />);
  if (place.instagram_url) rows.push(<Row key="ig" href={place.instagram_url} icon={ICONS.instagram} label="Instagram" value={hostLabel(place.instagram_url)} external />);
  if (place.facebook_url) rows.push(<Row key="fb" href={place.facebook_url} icon={ICONS.facebook} label="Facebook" value={hostLabel(place.facebook_url)} external />);
  if (rows.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-2 text-lg font-semibold text-gray-900">Contact</h2>
      <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">{rows}</ul>
    </section>
  );
}
