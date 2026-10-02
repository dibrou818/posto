"use client";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-gray-900">Cette action n&apos;a pas abouti</h1>
      <p className="mt-2 text-sm text-gray-500">
        Rien n&apos;a été perdu côté serveur : votre dernier enregistrement réussi est conservé. Vérifiez votre
        connexion, puis réessayez. Si le problème continue, revenez à la page précédente et refaites la modification.
      </p>
      <div className="mt-6 flex flex-col-reverse justify-center gap-2 sm:flex-row">
        <a
          href="/dashboard"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium text-gray-900 hover:bg-gray-50"
        >
          Retour à mes lieux
        </a>
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
