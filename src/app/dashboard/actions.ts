// Barrel re-exporting every dashboard server action by domain (see
// actions/places.ts, actions/activities.ts, actions/events.ts,
// actions/account.ts — actions/shared.ts holds what they have in common).
// Split out of what used to be one 667-line file mixing all four domains.
// Kept as a stable import path (every dashboard page still imports from
// "@/app/dashboard/actions") so this reorganization needed zero changes at
// any call site — a re-exported server action is still the same server
// action, "use server" lives on the file that actually defines it.
export { createPlace, updatePlace, generatePlaceQrCode, deletePlace, saveOpeningHours, savePlaceTags } from "./actions/places";
export { createActivity, updateActivity, deleteActivity } from "./actions/activities";
export { createEvent, updateEvent, generateEventQrCode, deleteEvent, saveEventPoster, deleteEventPoster } from "./actions/events";
export { deleteAccount } from "./actions/account";
