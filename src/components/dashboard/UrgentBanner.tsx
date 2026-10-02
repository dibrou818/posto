import Link from "next/link";
import { DeleteButton } from "@/components/ui/DeleteButton";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/** Shown at the top of every page of a place while its urgent message is
 * live, so it's never invisible — and so taking it down is two clicks from
 * anywhere: "Retirer", then "Confirmer". */
export function UrgentBanner({
  placeId,
  message,
  expiresAt,
  onRemove,
}: {
  placeId: string;
  message: string;
  expiresAt: string | null;
  onRemove: () => Promise<void>;
}) {
  return (
    <div role="status" className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
      <p className="text-xs font-semibold tracking-wide text-amber-800 uppercase">Message urgent affiché sur votre fiche</p>
      <p className="mt-1 text-sm text-amber-950">{message}</p>
      <p className="mt-0.5 text-xs text-amber-800">
        {expiresAt ? `Disparaît le ${dateFormat.format(new Date(expiresAt))}` : "Sans date de fin : il reste affiché jusqu'à ce que vous le retiriez."}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link
          href={`/dashboard/places/${placeId}/informations#urgent`}
          className="inline-flex min-h-10 items-center rounded-lg border border-amber-300 bg-white px-3 text-sm font-medium text-amber-950 transition-colors hover:bg-amber-100"
        >
          Modifier
        </Link>
        <DeleteButton
          action={onRemove}
          label="Retirer"
          unstyled
          className="inline-flex min-h-10 items-center rounded-lg border border-amber-300 bg-white px-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
          confirmMessage="Retirer le message urgent de votre fiche ?"
        />
      </div>
    </div>
  );
}
