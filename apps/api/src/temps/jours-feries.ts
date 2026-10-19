import { isoWeekday, nextDay } from "./paris";

/*
 * Les onze jours fériés de la France métropolitaine, **calculés** et non recopiés : une liste
 * figée serait fausse l'an prochain, et les majorations de jour férié se paient.
 *
 * Trois d'entre eux dépendent de Pâques (lundi de Pâques, Ascension, lundi de Pentecôte), qui se
 * calcule par l'algorithme grégorien anonyme. Les huit autres sont à date fixe.
 *
 * Ce que ce fichier **ne fait pas** : décider qu'un jour férié est majoré, ni de combien. Cela
 * appartient aux règles de l'agence (`domaine/regles.ts`), que Youdom Care saisit elle-même.
 */

/** Dimanche de Pâques, en `YYYY-MM-DD`. */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export type Holiday = { date: string; nom: string };

const FIXES: ReadonlyArray<[string, string]> = [
  ["01-01", "Jour de l'an"],
  ["05-01", "Fête du travail"],
  ["05-08", "Victoire 1945"],
  ["07-14", "Fête nationale"],
  ["08-15", "Assomption"],
  ["11-01", "Toussaint"],
  ["11-11", "Armistice 1918"],
  ["12-25", "Noël"],
];

/** Les onze jours fériés d'une année, triés. */
export function frenchHolidays(year: number): Holiday[] {
  const easter = easterSunday(year);
  const mobiles: Holiday[] = [
    { date: nextDay(easter, 1), nom: "Lundi de Pâques" },
    { date: nextDay(easter, 39), nom: "Ascension" },
    { date: nextDay(easter, 50), nom: "Lundi de Pentecôte" },
  ];
  return [...FIXES.map(([jour, nom]) => ({ date: `${year}-${jour}`, nom })), ...mobiles].sort(
    (a, b) => a.date.localeCompare(b.date),
  );
}

const cache = new Map<number, Map<string, string>>();

function indexOf(year: number): Map<string, string> {
  const connu = cache.get(year);
  if (connu) return connu;
  const index = new Map(frenchHolidays(year).map((jour) => [jour.date, jour.nom]));
  cache.set(year, index);
  return index;
}

/** Le nom du jour férié, ou `null`. */
export function holidayName(date: string): string | null {
  return indexOf(Number(date.slice(0, 4))).get(date) ?? null;
}

export function isHoliday(date: string): boolean {
  return holidayName(date) !== null;
}

export function isSunday(date: string): boolean {
  return isoWeekday(date) === 7;
}
