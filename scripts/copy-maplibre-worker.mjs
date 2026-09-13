// MapLibre GL JS v6 loads its tile-parsing Web Worker via
// `new URL('./maplibre-gl-worker.mjs', import.meta.url)` — a pattern
// Webpack/Vite rewrite automatically but Turbopack (next dev's bundler)
// doesn't yet, so it resolves to a URL that 404s (silently: every tile just
// stays stuck "loading" forever, no visible error). The fix is to serve a
// known-good copy of the worker ourselves and point maplibregl.setWorkerUrl()
// at it (see src/components/Map.tsx) — this script keeps that copy in sync
// with whatever maplibre-gl version is actually installed, so a future
// `npm update` can't silently make it stale.
//
// The worker module imports "./maplibre-gl-shared.mjs" as a relative
// sibling, so both files have to be copied to the same directory.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const srcDir = join(projectRoot, "node_modules", "maplibre-gl", "dist");
const destDir = join(projectRoot, "public", "maplibre");

mkdirSync(destDir, { recursive: true });

for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(join(srcDir, file), join(destDir, file));
}

console.log("Copied maplibre-gl worker files to public/maplibre/");
