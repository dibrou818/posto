import type { PlaceWithRelations, EventWithPlace } from "@/lib/queries";
import { getOpenStatus, formatOpenStatus } from "@/lib/opening-hours";
import { formatEventDateBadge } from "@/lib/eventSchedule";

// Split out of Map.tsx (which was pushing 1000+ lines) — these are pure
// string-building functions with zero dependency on a live map instance or
// React state, so they carry no risk moving: same inputs, same HTML string,
// wherever they're called from.

// Violet, distinct from the dark place dot — a glance at the map (or a
// popup) tells places and events apart even before opening anything. Also
// used by Map.tsx itself for the events layer's paint color, so this is the
// one place that actually owns the value.
export const EVENT_COLOR = "#7c3aed";

// Leaflet's bindPopup(string)/MapLibre's Popup#setHTML(string) both inject
// the string as raw HTML with no escaping of their own — place.name/
// place.address are free text any signed-up user controls, so they must be
// entity-encoded before going anywhere near this template, or a malicious
// place name becomes stored XSS for every visitor who opens its popup on the
// public map.
function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

// escapeHtml is only safe inside a text node: the textContent→innerHTML
// round-trip encodes &/</> but not quote characters, since quotes have no
// special meaning there. Dropped into an attribute (the cover photo's
// src="...") an unescaped `"` could close the attribute early and inject
// markup — cover_photo_url is validated server-side against an allowlist,
// but this doesn't rely on that holding to stay safe.
function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Small inline icons for the popup card — kept as plain SVG markup (not
// React components) since this whole template is a string handed to
// Popup#setHTML, not JSX.
const PIN_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.5-7-11.5a7 7 0 0 1 14 0C19 14.5 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.2"/></svg>';
const CALENDAR_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M3.5 9.5h17"/><path d="M8 3v4"/><path d="M16 3v4"/></svg>';

// Shared "card" chrome for both popup types: an optional cover photo flush
// with the (CSS-overridden, see globals.css) rounded corners, then a padded
// body. Kept as one helper so a place popup and an event popup always read
// as the same kind of object, just with different content inside.
function popupCard(opts: {
  coverPhotoUrl: string | null;
  title: string;
  subtitle: string;
  badge: { label: string; bg: string; fg: string; dot?: string; icon?: string };
  href: string;
  cta: string;
}) {
  return `
    <div style="width:208px;">
      ${
        opts.coverPhotoUrl
          ? `<div style="width:100%;height:92px;background:#e5e7eb;">
               <img src="${escapeAttr(opts.coverPhotoUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" />
             </div>`
          : ""
      }
      <div style="padding:10px 12px 12px;display:flex;flex-direction:column;gap:6px;">
        <span style="font-weight:600;font-size:14px;line-height:1.25;color:#111827;">${escapeHtml(opts.title)}</span>
        ${
          opts.subtitle
            ? `<span style="display:flex;align-items:center;gap:4px;font-size:12px;color:#6b7280;overflow:hidden;">
                 <span style="flex-shrink:0;display:flex;">${PIN_ICON_SVG}</span>
                 <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(opts.subtitle)}</span>
               </span>`
            : ""
        }
        <span style="display:inline-flex;align-items:center;gap:5px;width:fit-content;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:600;background:${opts.badge.bg};color:${opts.badge.fg};">
          ${opts.badge.dot ? `<span style="width:6px;height:6px;border-radius:50%;background:${opts.badge.dot};"></span>` : ""}
          ${opts.badge.icon ? `<span style="display:flex;">${opts.badge.icon}</span>` : ""}
          ${escapeHtml(opts.badge.label)}
        </span>
        <a href="${opts.href}" style="margin-top:2px;display:block;text-align:center;padding:7px 10px;border-radius:8px;background:#111827;color:#ffffff;font-size:12px;font-weight:600;text-decoration:none;">
          ${escapeHtml(opts.cta)}
        </a>
      </div>
    </div>
  `;
}

export function popupHtml(place: PlaceWithRelations) {
  const status = getOpenStatus(place.opening_hours);
  return popupCard({
    coverPhotoUrl: place.cover_photo_url,
    title: place.name,
    subtitle: place.address ?? "",
    badge: status.open
      ? { label: formatOpenStatus(status), bg: "#dcfce7", fg: "#166534", dot: "#22c55e" }
      : { label: formatOpenStatus(status), bg: "#fee2e2", fg: "#991b1b", dot: "#ef4444" },
    href: `/places/${place.id}`,
    cta: "Voir la fiche",
  });
}

export function eventPopupHtml(event: EventWithPlace) {
  return popupCard({
    coverPhotoUrl: event.cover_photo_url ?? event.place.cover_photo_url,
    title: event.title,
    subtitle: event.place.name,
    badge: {
      label: formatEventDateBadge(event.start_datetime),
      bg: "#ede9fe",
      fg: EVENT_COLOR,
      icon: CALENDAR_ICON_SVG,
    },
    href: `/events/${event.id}`,
    cta: "Voir l'événement",
  });
}
