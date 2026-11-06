/** Quick picks for the activity form: the things a place typically offers,
 * each tied to a tag slug so picking one also sets the category. Anything
 * not listed here is still possible — the name field stays free text. */
export const ACTIVITY_PRESETS: { label: string; tagSlug: string }[] = [
  { label: "Jeux de société", tagSlug: "jeux-de-societe" },
  { label: "Fléchettes", tagSlug: "flechettes" },
  { label: "Billard", tagSlug: "billard" },
  { label: "Arcade", tagSlug: "salle-arcade" },
  { label: "Jeux vidéo", tagSlug: "jeux-video" },
  { label: "Karaoké", tagSlug: "karaoke" },
  { label: "Quiz et blind test", tagSlug: "quiz-blind-test" },
  { label: "Bowling", tagSlug: "bowling" },
  { label: "Laser game", tagSlug: "laser-game" },
  { label: "Escape game", tagSlug: "escape-game" },
  { label: "Karting", tagSlug: "karting" },
  { label: "Mini-golf", tagSlug: "mini-golf" },
];
