import type { NextConfig } from "next";

// Every external origin the *browser* actually talks to (server-side-only
// fetches — Nominatim, Open-Meteo — don't belong here, CSP doesn't govern
// those). Verified by grepping the whole src/ tree for external URLs:
// - khvchawnkzamhfwrbhtz.supabase.co: supabase-js auth/storage calls, and
//   the raw <img> upload preview in PlaceForm (next/image itself proxies
//   through our own origin, so it doesn't need this in img-src, but the
//   plain <img> preview does).
// - tiles.openfreemap.org: MapLibre's vector tiles, style JSON, sprite and
//   glyph PBFs — all fetched via fetch()/XHR (connect-src), not plain <img>
//   tags, but it's also listed in img-src as a safety net for the style's
//   sprite image.
// - ipwho.is: the browser-side IP-geolocation fallback (see
//   lib/ipGeolocation.ts) — only called after the browser's own
//   geolocation prompt is denied/unavailable, straight fetch() from
//   LocationWeather, so it needs connect-src, not img-src.
// - images.unsplash.com / picsum.photos: a place/event's cover_photo_url can
//   legitimately point straight at either (see ALLOWED_PHOTO_HOSTS in
//   dashboard/actions.ts and images.remotePatterns below) instead of an
//   uploaded Supabase file. next/image's own proxy covers that everywhere
//   it renders one — except lib/poster.ts, which loads the cover photo into
//   a plain `new Image()` to composite it onto a canvas, bypassing that
//   proxy entirely. Without these two here, that raw load is silently
//   blocked by CSP and the poster falls back to its plain gradient
//   background, with no visible error besides a CSP console warning.
// next/font self-hosts Geist at build time (served from our own origin), so
// no fonts.googleapis.com/fonts.gstatic.com needed.
const SUPABASE_ORIGIN = "https://khvchawnkzamhfwrbhtz.supabase.co";
const OPENFREEMAP_ORIGIN = "https://tiles.openfreemap.org";
const UNSPLASH_ORIGIN = "https://images.unsplash.com";
const PICSUM_ORIGIN = "https://picsum.photos";
const IPWHO_ORIGIN = "https://ipwho.is";

const csp = [
  "default-src 'self'",
  `img-src 'self' data: ${SUPABASE_ORIGIN} ${OPENFREEMAP_ORIGIN} ${UNSPLASH_ORIGIN} ${PICSUM_ORIGIN}`,
  `connect-src 'self' ${SUPABASE_ORIGIN} ${OPENFREEMAP_ORIGIN} ${IPWHO_ORIGIN}`,
  // Next.js App Router streams RSC payloads through inline <script> tags on
  // every page load, so script-src can't be 'self'-only without a per-request
  // nonce (a bigger change, not done in this pass — flagged as a follow-up).
  // 'unsafe-eval' is dev-only: React's Fast Refresh/HMR uses eval() for
  // debugging, but (per React itself) never does in a production build.
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
  // Map markers/popups are built with inline style="..." attributes.
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  // MapLibre GL JS parses/renders vector tiles in a Web Worker spun up from
  // a blob: URL (its own bundled code, not a remote origin) — without this,
  // default-src 'self' blocks that worker outright since 'self' doesn't
  // implicitly cover blob:.
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
      // Supabase Storage — cover photos uploaded from the dashboard.
      { protocol: "https", hostname: "khvchawnkzamhfwrbhtz.supabase.co" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
