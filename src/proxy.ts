import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { checkRateLimit } from "@/lib/rateLimit";

// These call a free third-party geocoder (Nominatim, which has its own fair
// use policy) or run a DB query on every keystroke — worth capping per IP so
// a script can't hammer them. Note: /signup isn't listed here because it
// calls Supabase Auth directly from the browser, never touching this server
// — rate limiting it would need either Supabase's own Auth rate limits
// (enabled by default) or moving signup through a server action.
const RATE_LIMITED_ROUTES: { prefix: string; limit: number; windowMs: number }[] = [
  { prefix: "/api/search", limit: 20, windowMs: 60_000 },
  { prefix: "/api/geocode", limit: 20, windowMs: 60_000 },
  { prefix: "/api/location", limit: 20, windowMs: 60_000 },
];

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

export async function proxy(request: NextRequest) {
  const limited = RATE_LIMITED_ROUTES.find((r) => request.nextUrl.pathname.startsWith(r.prefix));
  if (limited) {
    const ip = getClientIp(request);
    const allowed = checkRateLimit(`${limited.prefix}:${ip}`, limited.limit, limited.windowMs);
    if (!allowed) {
      return NextResponse.json(
        { error: "Trop de requêtes, réessayez dans une minute." },
        { status: 429 },
      );
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
