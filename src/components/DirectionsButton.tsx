/** "Itinéraire" link, sits beside the Localisation heading so it reads as
 * "get there" right where the map is. */
export function DirectionsButton({ lat, lng }: { lat: number; lng: number }) {
  return (
    <a
      href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20"
    >
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4" aria-hidden="true">
        <path d="M17 3 3 8.5l5.5 2L10.5 17 17 3Z" strokeLinejoin="round" />
      </svg>
      Itinéraire
    </a>
  );
}
