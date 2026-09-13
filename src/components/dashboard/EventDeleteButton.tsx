"use client";

import { useRouter } from "next/navigation";
import { DeleteButton } from "@/components/ui/DeleteButton";

/** The delete control on an event's own edit page — thin wrapper around the
 * shared DeleteButton that also navigates back to the events list once the
 * delete resolves, since (unlike a delete from the list itself) this page
 * has nothing left to show afterwards. */
export function EventDeleteButton({
  placeId,
  eventTitle,
  action,
}: {
  placeId: string;
  eventTitle: string;
  action: () => Promise<void>;
}) {
  const router = useRouter();

  return (
    <DeleteButton
      action={action}
      label="Supprimer cet événement"
      className="text-sm"
      confirmMessage={`Supprimer l'événement « ${eventTitle} » ? Cette action est irréversible.`}
      onDeleted={() => router.push(`/dashboard/places/${placeId}/evenements`)}
    />
  );
}
