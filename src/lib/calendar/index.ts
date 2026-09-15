// Public surface of the calendar feature — a UI component only ever needs
// CalendarEventInput (what to pass in) and CALENDAR_PROVIDERS/
// ICS_FALLBACK_PROVIDER (what to render); it never touches google.ts/
// outlook.ts/ics.ts/dates.ts directly. The .ics route handler is the one
// other caller, and only needs buildIcsContent + icsFilename from here.
export type { CalendarEventInput } from "./types";
export { CALENDAR_PROVIDERS, ICS_FALLBACK_PROVIDER, type CalendarProviderId, type CalendarProviderDef } from "./providers";
export { buildIcsContent, icsFilename } from "./ics";
