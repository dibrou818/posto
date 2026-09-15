import { headers } from "next/headers";

/** The current request's own origin (protocol + host) — works unmodified on
 * localhost, a Vercel preview branch (e.g. the "test" branch used for
 * street testing), and goposto.com alike, since it reads the actual
 * incoming request rather than a hardcoded production domain. Used
 * anywhere a full absolute URL has to be built server-side: QR codes, the
 * .ics calendar file, Open Graph metadata. */
export async function getSiteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
