import { buildGoogleCalendarUrl } from "./google";
import { buildOutlookCalendarUrl } from "./outlook";
import type { CalendarEventInput } from "./types";

export type CalendarProviderId = "google" | "apple" | "outlook" | "ics";

export type CalendarProviderDef = {
  id: CalendarProviderId;
  label: string;
  getHref: (event: CalendarEventInput) => string;
  /** true = a normal link to another site (opens Google/Outlook's own
   * compose screen) — new tab, so Posto stays open behind it. false = this
   * link's response IS the calendar event (the .ics route): same tab, plus
   * a `download` hint, so the OS/browser's own file handling takes over
   * instead of spawning an empty tab that then has to redirect or close
   * itself. */
  opensExternalSite: boolean;
};

/** Every event's own public page + "/calendar.ics" (see
 * app/events/[id]/calendar.ics/route.ts) — the one URL Apple Calendar and
 * the universal fallback both point at; there's exactly one .ics file per
 * event, not two copies of the same generation logic. */
function icsRouteUrl(event: CalendarEventInput): string {
  return `${event.pageUrl}/calendar.ics`;
}

/** The list a viewer sees, in this order — reordering is a one-line change
 * here, nothing in the UI component needs to know why. No reliable public
 * data exists on French calendar-app market share (deliberately not
 * fabricated — see the feature's delivery notes), so the order instead
 * follows: Google Agenda first (near-universal on Android including
 * Samsung devices, and a common personal choice on iOS/Mac too, plus the
 * smoothest possible flow — no file, no prompt); Calendrier Apple second
 * (the default on every iPhone/iPad/Mac, which is a large share of the
 * French mobile market); Outlook third (common for professional use in
 * France, less likely as a personal "sortir ce soir" calendar than the
 * first two). Samsung Calendar has no dedicated entry — see the feature's
 * delivery notes for why forcing one wouldn't be reliable — its users are
 * already covered by Google Agenda (present on effectively every Samsung
 * phone) and, failing that, "Autre / .ics" (Samsung Calendar itself
 * accepts .ics import like any standard Android calendar app). */
export const CALENDAR_PROVIDERS: CalendarProviderDef[] = [
  { id: "google", label: "Google Agenda", getHref: buildGoogleCalendarUrl, opensExternalSite: true },
  { id: "apple", label: "Calendrier Apple", getHref: icsRouteUrl, opensExternalSite: false },
  { id: "outlook", label: "Outlook", getHref: buildOutlookCalendarUrl, opensExternalSite: true },
];

/** Always last, always present, on its own below a divider — the universal
 * escape hatch (Thunderbird, Yahoo, Zoho, any desktop calendar, Samsung
 * Calendar's own .ics import…) for anyone not covered by the three above,
 * or who just prefers handling the file themselves. */
export const ICS_FALLBACK_PROVIDER: CalendarProviderDef = {
  id: "ics",
  label: "Autre / .ics",
  getHref: icsRouteUrl,
  opensExternalSite: false,
};
