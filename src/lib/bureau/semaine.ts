/*
 * Le calendrier de la semaine, côté écran. Aucune dépendance de dates : le besoin tient en
 * quelques fonctions, et une bibliothèque de plus se paie en poids sur un outil qu'on ouvre
 * cinquante fois par jour.
 *
 * Les dates manipulées ici sont des **jours** (`AAAA-MM-JJ`), pas des instants : un planning se
 * lit en jours, et c'est l'API qui porte les heures et les fuseaux (`apps/api/src/temps/paris.ts`).
 */

export const JOURS = [
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
  "dimanche",
] as const;

export function ajouterJours(date: string, jours: number): string {
  const [annee, mois, jour] = date.split("-").map(Number);
  return new Date(Date.UTC(annee, mois - 1, jour + jours)).toISOString().slice(0, 10);
}

/** Lundi = 1 … dimanche = 7. */
export function jourIso(date: string): number {
  const [annee, mois, jour] = date.split("-").map(Number);
  const indice = new Date(Date.UTC(annee, mois - 1, jour)).getUTCDay();
  return indice === 0 ? 7 : indice;
}

/** Le lundi de la semaine d'une date. */
export function lundiDe(date: string): string {
  return ajouterJours(date, 1 - jourIso(date));
}

export function semaineDe(date: string): { from: string; to: string } {
  const from = lundiDe(date);
  return { from, to: ajouterJours(from, 6) };
}

export function joursDe(semaine: { from: string; to: string }): string[] {
  const out: string[] = [];
  for (let date = semaine.from; date <= semaine.to; date = ajouterJours(date, 1)) out.push(date);
  return out;
}

const FORMAT_JOUR = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** « lundi 19 octobre » — pour un titre de colonne lisible. */
export function libelleJour(date: string): string {
  return FORMAT_JOUR.format(new Date(`${date}T00:00:00Z`));
}

const FORMAT_COURT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

const FORMAT_JOUR_SEUL = new Intl.DateTimeFormat("fr-FR", { day: "numeric", timeZone: "UTC" });

/**
 * « du 19 au 25 octobre », et « du 28 septembre au 4 octobre » quand la semaine change de mois.
 * Répéter le mois deux fois dans la même ligne se lit mal, et une semaine à cheval doit le dire.
 */
export function libelleSemaine(semaine: { from: string; to: string }): string {
  const debut = new Date(`${semaine.from}T00:00:00Z`);
  const fin = new Date(`${semaine.to}T00:00:00Z`);
  const memeMois = semaine.from.slice(0, 7) === semaine.to.slice(0, 7);
  const premier = memeMois ? FORMAT_JOUR_SEUL.format(debut) : FORMAT_COURT.format(debut);
  return `du ${premier} au ${FORMAT_COURT.format(fin)}`;
}

/** Le jour d'aujourd'hui, en `AAAA-MM-JJ`, à l'heure de Paris. */
export function aujourdhui(maintenant: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(maintenant);
  return parts;
}
