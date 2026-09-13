import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Posto — Découvrez des lieux et activités",
  description: "Trouvez des lieux proposant des activités récurrentes et des événements ponctuels près de vous.",
};

// `viewport-fit=cover` is what lets the page draw all the way under a
// notch/Dynamic Island/rounded corners instead of Safari reserving a
// blank strip for them — without it, env(safe-area-inset-*) below also
// always reports 0, so nothing that depends on it (BottomNav, Header,
// the full-screen map) can do the right thing either.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Warms up the DNS/TLS handshake to the map tile host ahead of
            time — the map component only starts requesting from it once its
            JS has loaded and run, so without this every first tile/style/
            glyph request pays that latency on top of the fetch itself. */}
        <link rel="preconnect" href="https://tiles.openfreemap.org" />
        <link rel="dns-prefetch" href="https://tiles.openfreemap.org" />
      </head>
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <Header user={user} />
        {/* This padding exists purely to keep content from sitting under the
            fixed BottomNav — it must match that nav's real rendered height
            exactly, or a page whose content fills to the very bottom (like
            /map) leaves a visible gap of bare background. BottomNav is
            `min-h-14` (3.5rem) plus the device's safe-area inset, so this
            mirrors both terms rather than a flat guess like `pb-16`. */}
        <main className="flex-1 flex flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
        <BottomNav user={user} />
      </body>
    </html>
  );
}
