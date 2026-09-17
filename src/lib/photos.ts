import type { PlaceWithRelations } from "@/lib/queries";

/** A place's cover photo first, then its gallery (photo_urls) — the one
 * definition of "this place's ordered photo list", shared by the detail
 * page's full-size carousel and the map popup's own mini version of it, so
 * the two can never disagree about how many photos a place has or what
 * order they come in. */
export function placePhotos(place: Pick<PlaceWithRelations, "cover_photo_url" | "photo_urls">): string[] {
  return [place.cover_photo_url, ...place.photo_urls].filter((url): url is string => Boolean(url));
}
