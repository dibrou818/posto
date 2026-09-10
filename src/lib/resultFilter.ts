// Shared between SearchBar's own suggestion dropdown and the home page's
// browse grid, so "Lieux / Événements / Tout" means the same thing and is
// implemented once.
export type ResultKindFilter = "all" | "place" | "event";

export const RESULT_KIND_OPTIONS: { value: ResultKindFilter; label: string }[] = [
  { value: "all", label: "Tout" },
  { value: "place", label: "Lieux" },
  { value: "event", label: "Événements" },
];

// "place" also covers "activity" rows — both are anchored to a venue rather
// than a date, so from the user's point of view they're both "un lieu".
export function matchesResultKind(
  kind: "place" | "activity" | "event",
  filter: ResultKindFilter,
) {
  if (filter === "all") return true;
  if (filter === "event") return kind === "event";
  return kind === "place" || kind === "activity";
}
