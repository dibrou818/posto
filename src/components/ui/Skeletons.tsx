/** Loading placeholders that match the real layouts (a compact row on phones,
 * an image-first tile above), so a page doesn't jump when its content
 * arrives. Decorative: hidden from assistive tech, with the loading state
 * announced once by the route's own `loading.tsx`. */
export function CardSkeleton() {
  return (
    <div aria-hidden="true" className="flex items-center gap-3.5 sm:block">
      <div className="posto-skeleton size-24 shrink-0 rounded-2xl sm:aspect-[16/10] sm:size-auto sm:rounded-3xl" />
      <div className="min-w-0 flex-1 space-y-2 sm:mt-2.5 sm:flex-none sm:px-0.5">
        <div className="posto-skeleton h-3 w-1/3 rounded sm:hidden" />
        <div className="posto-skeleton h-4 w-3/4 rounded" />
        <div className="posto-skeleton h-3.5 w-1/2 rounded" />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-y-3.5 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-7 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}
