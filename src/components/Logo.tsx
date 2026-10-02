const MARK_PATH =
  "M16 24A18 18 0 1 1 28 40.97L28 48C28 54 25 58 23.2 60.2Q22 61.6 20.8 60.2C19 58 16 54 16 48Z M34 16a8 8 0 1 0 0 16a8 8 0 1 0 0-16Z";

/** The Posto "P": a letter whose foot is a map-pin tip, with a dot in the
 * counter. Single color (currentColor); the counter shows whatever is behind. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="2 1.8 64 64" fill="currentColor" aria-hidden="true" className={className}>
      <path fillRule="evenodd" d={MARK_PATH} />
      <circle cx="34" cy="24" r="4.5" />
    </svg>
  );
}

/** White P on a Posto-blue rounded square (iOS-style corner radius) — the
 * app icon, also used next to the wordmark. */
export function LogoBubble({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="inline-grid shrink-0 place-items-center rounded-[22.4%] bg-brand text-white"
    >
      <LogoMark className="h-[64%] w-[64%]" />
    </span>
  );
}

/** The logo as used inside the app: the blue P on the page's own background,
 * with no container, followed by the lowercase "posto" wordmark. */
export function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
  const markHeight = size * 0.95;
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <svg
        viewBox="15 5 38 57.6"
        fill="currentColor"
        aria-hidden="true"
        style={{ height: markHeight, width: (markHeight * 38) / 57.6 }}
        className="shrink-0 text-brand"
      >
        <path fillRule="evenodd" d={MARK_PATH} />
        <circle cx="34" cy="24" r="4.5" />
      </svg>
      <span
        style={{ fontSize: size * 0.75 }}
        className="font-[family-name:var(--font-display)] font-extrabold leading-none tracking-[-0.05em] text-gray-900"
      >
        posto
      </span>
    </span>
  );
}
