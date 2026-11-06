export default function Loading() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Chargement de la page">
      <span className="sr-only">Chargement…</span>
      <div aria-hidden="true" className="space-y-4">
        <div className="posto-skeleton h-8 w-1/2 max-w-xs rounded-xl" />
        <div className="posto-skeleton h-24 rounded-2xl" />
        <div className="posto-skeleton h-24 rounded-2xl" />
      </div>
    </div>
  );
}
