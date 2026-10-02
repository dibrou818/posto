import type { Event } from "@/lib/queries";
import { DEFAULT_EVENT_DURATION_MINUTES, isEventHappeningNow } from "@/lib/eventSchedule";

export type EventStatusKey = "live" | "upcoming" | "recurring" | "past";

export type EventStatus = {
  key: EventStatusKey;
  label: string;
  /** Tailwind classes for the small status pill. */
  className: string;
};

type StatusInput = Pick<Event, "start_datetime" | "end_datetime" | "duration_minutes" | "recurrence_rule">;

/** Where an event is in its life, for the dashboard's lists and headers: a
 * recurring event is never "past" (it keeps coming back), otherwise it's
 * live while inside its run, upcoming before it and past after it. */
export function getEventStatus(event: StatusInput, now: Date = new Date()): EventStatus {
  if (event.recurrence_rule) {
    return { key: "recurring", label: "Récurrent", className: "bg-gray-100 text-gray-700" };
  }
  if (isEventHappeningNow(event.start_datetime, event.end_datetime, event.duration_minutes, now)) {
    return { key: "live", label: "En cours", className: "bg-green-100 text-green-800" };
  }
  const start = new Date(event.start_datetime);
  const end = event.end_datetime
    ? new Date(event.end_datetime)
    : new Date(start.getTime() + (event.duration_minutes ?? DEFAULT_EVENT_DURATION_MINUTES) * 60_000);
  if (now > end) {
    return { key: "past", label: "Terminé", className: "bg-gray-100 text-gray-500" };
  }
  return { key: "upcoming", label: "À venir", className: "bg-gray-100 text-gray-700" };
}
