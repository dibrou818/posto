"use client";

import { SaveButton } from "@/components/ui/SaveButton";

/** QR generator + preview for a place or an event: the target URL is always
 * `/places/<id>` or `/events/<id>` — keyed on the row's immutable id, so the
 * code stays valid for the life of that place/event no matter what its
 * owner edits afterwards. No auto-regeneration on save, by design: a
 * printed poster shouldn't silently point somewhere new. */
export function QrCodeSection({
  qrCodeUrl,
  publicPath,
  action,
}: {
  qrCodeUrl: string | null;
  publicPath: string;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white">
        {qrCodeUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrCodeUrl} alt="Code QR" className="h-full w-full object-contain p-2" />
        ) : (
          <span className="px-2 text-center text-xs text-gray-400">Pas encore généré</span>
        )}
      </div>
      <div className="flex flex-col items-start gap-2">
        <p className="text-xs text-gray-500">
          Pointe vers <span className="font-medium text-gray-700">{publicPath}</span> — reste
          valide même après modification des infos.
        </p>
        <form action={action}>
          <SaveButton size="compact" savedLabel="Généré ✓" pendingLabel="Génération...">
            {qrCodeUrl ? "Régénérer le code QR" : "Générer le code QR"}
          </SaveButton>
        </form>
        {qrCodeUrl && (
          <a
            href={qrCodeUrl}
            download="code-qr.png"
            className="text-xs font-medium text-gray-700 underline transition-colors hover:text-gray-900"
          >
            Télécharger l&apos;image
          </a>
        )}
      </div>
    </div>
  );
}
