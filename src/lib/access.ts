/** How a visitor gets into an event or activity. Stored as a short code in
 * `events.access` / `activities.access`; NULL means "not specified" and
 * nothing is shown. */
export const ACCESS_OPTIONS = [
  { value: "free", label: "Entrée libre", hint: "On peut venir sans prévenir" },
  { value: "registration", label: "Sur inscription", hint: "Inscription obligatoire avant" },
  { value: "reservation", label: "Sur réservation", hint: "Créneau à réserver" },
] as const;

export type AccessValue = (typeof ACCESS_OPTIONS)[number]["value"];

const ACCESS_VALUES: string[] = ACCESS_OPTIONS.map((option) => option.value);

export function isAccessValue(value: string | null | undefined): value is AccessValue {
  return !!value && ACCESS_VALUES.includes(value);
}

export function accessLabel(value: string | null | undefined): string | null {
  return ACCESS_OPTIONS.find((option) => option.value === value)?.label ?? null;
}
