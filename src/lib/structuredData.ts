import type { PlaceWithRelations, EventWithPlace } from "@/lib/queries";

// Every field below comes straight from data Posto already collects for its
// own pages (name, address, hours, price...) — this file only reshapes it
// into schema.org's vocabulary so search engines (and increasingly, AI
// answer engines reading structured data instead of scraping prose) can
// parse "what is this, where, when, how much" without guessing from HTML.
// Zero new data, zero new dependency: this was previously just absent.

/** A handful of tags map onto a schema.org type that's meaningfully more
 * specific than the generic "LocalBusiness" — worth using where it's a
 * clean fit, since a more specific type is more likely to qualify for a
 * matching rich-result treatment. Every unlisted tag (and every place with
 * no tags at all) safely falls back to LocalBusiness, which is always
 * valid, just less specific. */
const TAG_TO_SCHEMA_TYPE: Record<string, string> = {
  Bar: "BarOrPub",
  Restaurant: "Restaurant",
  Bowling: "BowlingAlley",
  Karting: "SportsActivityLocation",
  // The rest (Escape Game, Laser Game, Billard, Karaoké, Mini-golf, Salle
  // d'arcade...) don't have a dedicated schema.org type, but they're all
  // squarely "a business people go to for entertainment" — a real schema.org
  // type, and a better fit than the fully generic LocalBusiness.
};
const DEFAULT_ENTERTAINMENT_TYPE = "EntertainmentBusiness";

function schemaTypeForPlace(place: PlaceWithRelations): string {
  for (const tag of place.tags) {
    const mapped = TAG_TO_SCHEMA_TYPE[tag.label];
    if (mapped) return mapped;
  }
  return place.tags.length > 0 ? DEFAULT_ENTERTAINMENT_TYPE : "LocalBusiness";
}

const DAY_NAMES_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// "HH:MM:SS" (what Postgres' `time` type round-trips as) -> "HH:MM", which
// is what schema.org's opens/closes expect.
function toHhMm(time: string): string {
  return time.slice(0, 5);
}

export function localBusinessJsonLd(place: PlaceWithRelations, pageUrl: string): Record<string, unknown> {
  const address: Record<string, string> = { "@type": "PostalAddress", addressCountry: "FR" };
  if (place.address) address.streetAddress = place.address;
  if (place.city) address.addressLocality = place.city;
  if (place.postcode) address.postalCode = place.postcode;

  // Only the place's general schedule — a zone-specific sub-schedule (see
  // opening-hours.ts's own zone_name handling) describes one area of the
  // venue, not "is this business open", which is what this field means.
  const generalHours = place.opening_hours.filter((h) => h.zone_name === null);

  const sameAs = [place.website_url, place.instagram_url, place.facebook_url].filter(
    (url): url is string => Boolean(url),
  );

  return {
    "@context": "https://schema.org",
    "@type": schemaTypeForPlace(place),
    name: place.name,
    ...(place.description ? { description: place.description } : {}),
    url: pageUrl,
    ...(place.cover_photo_url ? { image: place.cover_photo_url } : {}),
    ...(place.phone ? { telephone: place.phone } : {}),
    address,
    geo: { "@type": "GeoCoordinates", latitude: place.lat, longitude: place.lng },
    ...(generalHours.length > 0
      ? {
          openingHoursSpecification: generalHours.map((h) => ({
            "@type": "OpeningHoursSpecification",
            dayOfWeek: `https://schema.org/${DAY_NAMES_EN[h.day_of_week]}`,
            opens: toHhMm(h.open_time),
            closes: toHhMm(h.close_time),
          })),
        }
      : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

export function eventJsonLd(event: EventWithPlace, pageUrl: string): Record<string, unknown> {
  const { place } = event;
  const coverPhotoUrl = event.cover_photo_url ?? place.cover_photo_url;

  const address: Record<string, string> = { "@type": "PostalAddress", addressCountry: "FR" };
  if (place.address) address.streetAddress = place.address;
  if (place.city) address.addressLocality = place.city;
  if (place.postcode) address.postalCode = place.postcode;

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    ...(event.description ? { description: event.description } : {}),
    url: pageUrl,
    ...(coverPhotoUrl ? { image: coverPhotoUrl } : {}),
    startDate: event.start_datetime,
    ...(event.end_datetime ? { endDate: event.end_datetime } : {}),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: place.name,
      address,
      geo: { "@type": "GeoCoordinates", latitude: place.lat, longitude: place.lng },
    },
    // A price of exactly 0 is a legitimate free event, not "no price data" —
    // only price_cents being absent means there's genuinely nothing to
    // report here.
    ...(event.price_cents !== null
      ? {
          offers: {
            "@type": "Offer",
            url: pageUrl,
            price: (event.price_cents / 100).toFixed(2),
            priceCurrency: "EUR",
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
  };
}

/** JSON.stringify, but safe to drop straight into a <script> tag's
 * innerHTML — a place/event description containing a literal "</script>"
 * would otherwise close the tag early and dump the rest as page text. */
export function jsonLdScriptContent(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
