import { accessLabel, isAccessValue } from "@/lib/access";

const STYLES = {
  free: "bg-green-50 text-green-800",
  registration: "bg-blue-50 text-blue-800",
  reservation: "bg-blue-50 text-blue-800",
} as const;

/** Small pill saying how to get in (entrée libre / sur inscription / sur
 * réservation). Renders nothing when the access isn't specified. */
export function AccessBadge({ access }: { access: string | null | undefined }) {
  if (!isAccessValue(access)) return null;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STYLES[access]}`}>
      {accessLabel(access)}
    </span>
  );
}
