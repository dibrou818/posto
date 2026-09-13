import { redirect } from "next/navigation";

// This bare route used to be the whole management page; its content is now
// split across informations/horaires/activites/evenements/parametres (see
// the layout in this same folder). Kept as a redirect, not deleted outright,
// so any link still pointing at the old URL (an old bookmark, a stale
// revalidatePath target) lands somewhere real instead of a blank/404 page.
export default async function EditPlaceRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") query.set(key, value);
  }
  const suffix = query.size > 0 ? `?${query}` : "";
  redirect(`/dashboard/places/${id}/informations${suffix}`);
}
