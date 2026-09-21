export function eventStatus(startIso: string, endIso: string | null, now = Date.now()): string {
  const start = Date.parse(startIso);
  const end = endIso ? Date.parse(endIso) : null;
  if (!Number.isFinite(start)) return "Date à confirmer";
  if (start > now) return start - now <= 60 * 60 * 1000 ? "Commence bientôt" : "À venir";
  if (end !== null && Number.isFinite(end) && end > start) {
    if (end <= now) return "Terminé";
    return end - now <= 30 * 60 * 1000 ? "Se termine bientôt" : "En cours";
  }
  return "Début passé";
}
