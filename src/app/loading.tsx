import { CardGridSkeleton } from "@/components/ui/Skeletons";

export default function Loading() {
  return (
    <div className="posto-page" role="status" aria-label="Chargement de la page">
      <span className="sr-only">Chargement…</span>
      <div aria-hidden="true" className="mb-6 space-y-3">
        <div className="posto-skeleton h-9 w-2/3 max-w-sm rounded-xl" />
        <div className="posto-skeleton h-4 w-1/2 rounded" />
      </div>
      <CardGridSkeleton />
    </div>
  );
}
