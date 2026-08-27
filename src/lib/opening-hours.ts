import type { Tables } from "@/types/database.types";

export type OpeningHour = Tables<"opening_hours">;

const DAY_LABELS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

export function dayLabel(dayOfWeek: number) {
  return DAY_LABELS[dayOfWeek];
}

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function isOpenNow(hours: OpeningHour[], now: Date = new Date()) {
  const today = hours.find((h) => h.day_of_week === now.getDay());
  if (!today) return false;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return (
    nowMinutes >= toMinutes(today.open_time) &&
    nowMinutes < toMinutes(today.close_time)
  );
}

export function scheduleByDay(hours: OpeningHour[]) {
  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    label: dayLabel(dayOfWeek),
    hours: hours.filter((h) => h.day_of_week === dayOfWeek),
  }));
}
