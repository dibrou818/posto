import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
      // Supabase Storage — cover photos uploaded from the dashboard.
      { protocol: "https", hostname: "khvchawnkzamhfwrbhtz.supabase.co" },
    ],
  },
};

export default nextConfig;
