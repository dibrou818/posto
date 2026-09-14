import type { EventWithPlace } from "@/lib/queries";

/** Whether `event` matches `tagId` for the purposes of a tag filter. An
 * event with its own `tag_id` set matches only that tag; one left blank is
 * meant to "inherit" its place's tags — that's literally what the dashboard
 * form's empty option says ("Hérite des tags du lieu") — so it matches
 * whichever of the place's own tags the filter is set to, not nothing. */
export function eventMatchesTag(event: EventWithPlace, tagId: string): boolean {
  if (event.tag_id) return event.tag_id === tagId;
  return event.place.tags.some((t) => t.id === tagId);
}
