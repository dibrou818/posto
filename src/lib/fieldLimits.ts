// Character limits for user-entered text fields. Shared by each dashboard
// form's `maxLength` (a nicer UX — stops typing at the limit) and the
// matching server action's validation (see dashboard/actions.ts) — the
// server enforces these regardless of what actually reaches it, since
// nothing stops a request built directly against the action, bypassing the
// form entirely.
export const PLACE_NAME_MAX_LENGTH = 80;
export const PLACE_DESCRIPTION_MAX_LENGTH = 500;
export const URGENT_MESSAGE_MAX_LENGTH = 200;

export const ACTIVITY_NAME_MAX_LENGTH = 80;
export const ACTIVITY_DESCRIPTION_MAX_LENGTH = 300;

export const EVENT_TITLE_MAX_LENGTH = 100;
export const EVENT_DESCRIPTION_MAX_LENGTH = 500;
export const EVENT_RECURRENCE_MAX_LENGTH = 60;
export const EVENT_PRICE_MAX_LENGTH = 40;

// Shared by activities and events — both have a free-text "conditions
// d'accès" field with the same shape and the same limit.
export const RESTRICTIONS_MAX_LENGTH = 150;
