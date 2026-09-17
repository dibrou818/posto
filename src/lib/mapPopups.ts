// Split out of Map.tsx (which was pushing 1000+ lines) — these are pure
// string-building functions with zero dependency on a live map instance or
// React state, so they carry no risk moving: same inputs, same HTML string,
// wherever they're called from.
//
// The photo itself is no longer built here — lib/mapPopupContent.tsx mounts
// the real PhotoCarousel component into a DOM node of its own and appends
// this file's body markup right after it, so a place/event with several
// photos gets the exact same swipe/arrow navigation in its popup as on its
// full page instead of a second, plain-<img> reimplementation.

// Violet, distinct from the dark place dot — a glance at the map (or a
// popup) tells places and events apart even before opening anything. Also
// used by Map.tsx itself for the events layer's paint color, so this is the
// one place that actually owns the value.
export const EVENT_COLOR = "#7c3aed";
// Same reasoning as EVENT_COLOR above — Map.tsx's own place-marker paint
// color, exported so anything else that needs to draw "this is a place, in
// Posto's own colors" (LocationMiniMapCanvas included) never has to
// re-guess the hex value.
export const PLACE_COLOR = "#111827";

// Leaflet's bindPopup(string)/MapLibre's Popup#setHTML(string) both inject
// the string as raw HTML with no escaping of their own — place.name/
// place.address are free text any signed-up user controls, so they must be
// entity-encoded before going anywhere near this template, or a malicious
// place name becomes stored XSS for every visitor who opens its popup on the
// public map.
export function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

// Small inline icons for the popup card — kept as plain SVG markup (not
// React components) since this whole template is a string handed to
// Popup#setHTML, not JSX.
export const PIN_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.5-7-11.5a7 7 0 0 1 14 0C19 14.5 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.2"/></svg>';
export const CALENDAR_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M3.5 9.5h17"/><path d="M8 3v4"/><path d="M16 3v4"/></svg>';

/** The popup card's body — title/address-or-place-name/status-or-date badge/
 * CTA link — everything except the photo, which lib/mapPopupContent.tsx
 * mounts separately (a real PhotoCarousel, not a string). Kept as one
 * helper so a place popup and an event popup always read as the same kind
 * of object, just with different content inside. */
export function popupBodyHtml(opts: {
  title: string;
  subtitle: string;
  badge: { label: string; bg: string; fg: string; dot?: string; icon?: string };
  href: string;
  cta: string;
}) {
  return `
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
  `;
}
