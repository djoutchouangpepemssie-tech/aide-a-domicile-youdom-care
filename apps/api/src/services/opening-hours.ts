/*
 * Les heures d'ouverture, qui décident de ce qui relève de l'astreinte (MY-05).
 *
 * **Valeurs à confirmer par Arcel** : elles sont reprises de ce que le site annonce aujourd'hui.
 * Elles ne servent qu'à une chose ici — savoir si un accès au dossier se fait pendant ou en dehors
 * des heures ouvrées, parce qu'un accès hors heures exige un motif saisi. Elles ne décident
 * d'aucun planning.
 */

export type OpeningHours = { day: number; from: string; to: string }[];

/** Lundi = 1 … dimanche = 7. */
export const DEFAULT_OPENING_HOURS: OpeningHours = [
  { day: 1, from: "08:30", to: "18:30" },
  { day: 2, from: "08:30", to: "18:30" },
  { day: 3, from: "08:30", to: "18:30" },
  { day: 4, from: "08:30", to: "18:30" },
  { day: 5, from: "08:30", to: "18:30" },
  { day: 6, from: "09:00", to: "12:30" },
];

const minutes = (time: string): number => {
  const [heures, mns] = time.split(":").map(Number);
  return heures * 60 + mns;
};

/**
 * `date` est lue à l'heure de Paris : le serveur peut tourner en UTC, les heures d'ouverture sont
 * celles de l'agence. Sans cela, l'astreinte commencerait deux heures trop tôt en été.
 */
export function isOutsideOpeningHours(
  date: Date,
  hours: OpeningHours = DEFAULT_OPENING_HOURS,
): boolean {
  const parisien = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const heure = parisien.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parisien.find((part) => part.type === "minute")?.value ?? "00";
  // `getUTCDay` ne convient pas : à 1 h du matin à Paris, on est encore la veille en UTC.
  const jourParis = new Date(date.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const day = jourParis.getDay() === 0 ? 7 : jourParis.getDay();

  const plage = hours.find((item) => item.day === day);
  if (!plage) return true;
  const instant = minutes(`${heure}:${minute}`);
  return instant < minutes(plage.from) || instant >= minutes(plage.to);
}
