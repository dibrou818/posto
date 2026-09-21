export default function Loading() {
  return <div className="posto-page" role="status" aria-label="Chargement de la page"><span className="sr-only">Chargement…</span><div aria-hidden="true" className="animate-pulse"><div className="mb-4 h-9 w-2/3 max-w-sm rounded-xl bg-gray-200" /><div className="mb-8 h-4 w-1/2 rounded bg-gray-200" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3,4,5,6].map(i => <div key={i} className="h-36 rounded-2xl border border-gray-200 bg-white" />)}</div></div></div>;
}
