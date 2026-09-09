import type { NextConfig } from "next";

// Every external origin the *browser* actually talks to (server-side-only
// fetches — Nominatim, Open-Meteo — don't belong here, CSP doesn't govern
// those). Verified by grepping the whole src/ tree for external URLs:
// - khvchawnkzamhfwrbhtz.supabase.co: supabase-js auth/storage calls, and
//   the raw <img> upload preview in PlaceForm (next/image itself proxies
//   through our own origin, so it doesn't need this in img-src, but the
//   plain <img> preview does).
// - *.basemaps.cartocdn.com: Leaflet map tile images.
// next/font self-hosts Geist at build time (served from our own origin), so
// no fonts.googleapis.com/fonts.gstatic.com needed.
const SUPABASE_ORIGIN = "https://khvchawnkzamhfwrbhtz.supabase.co";
const CARTO_TILES = "https://*.basemaps.cartocdn.com";

const csp = [
  "default-src 'self'",
  `img-src 'self' data: ${SUPABASE_ORIGIN} ${CARTO_TILES}`,
  `connect-src 'self' ${SUPABASE_ORIGIN}`,
  // Next.js App Router streams RSC payloads through inline <script> tags on
  // every page load, so script-src can't be 'self'-only without a per-request
  // nonce (a bigger change, not done in this pass — flagged as a follow-up).
  // 'unsafe-eval' is dev-only: React's Fast Refresh/HMR uses eval() for
  // debugging, but (per React itself) never does in a production build.
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
  // Leaflet markers/popups are built with inline style="..." attributes.
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
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
