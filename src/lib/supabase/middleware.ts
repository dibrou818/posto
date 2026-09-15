import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() also transparently refreshes an expired access token using
  // the refresh token — that's the normal case this exists for, and it's
  // silent/automatic. But when the refresh token is *itself* no longer
  // valid (revoked, past its own lifetime, or just a long-idle tab that
  // outlasted it), refreshing fails and supabase-js does NOT reliably clear
  // the now-permanently-broken cookie on its own — it just keeps sitting
  // there. Every request after that (from Server Components using the
  // regular createClient(), which trusts whatever cookie is present) then
  // resends that same dead access token and gets rejected by PostgREST
  // before Row Level Security is even evaluated — including on pages that
  // never needed a session at all (the public home page reading `places`,
  // which anyone can read via RLS, crashing outright with "JWT expired"
  // instead of just... rendering, anonymously, the way an anonymous
  // visitor should always be able to).
  //
  // The fix: when getUser() reports an error and there *was* a session
  // cookie to begin with (an actual broken session, not just "no one's
  // logged in" — that's the ordinary, error-free anonymous case and isn't
  // touched here), explicitly clear it. `scope: "local"` only wipes the
  // local cookie/session state, no network round-trip to revoke it
  // server-side — which could itself fail for the exact same reason
  // (there's nothing valid left to revoke). The very next request then
  // starts clean, falls back to the anon key, and every public page works
  // again on its own — no more manually clearing cookies to recover.
  const hadAuthCookie = request.cookies.getAll().some((c) => c.name.includes("-auth-token"));
  const { error } = await supabase.auth.getUser();
  if (error && hadAuthCookie) {
    await supabase.auth.signOut({ scope: "local" });
  }

  return supabaseResponse;
}
