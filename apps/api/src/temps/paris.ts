/*
 * Le temps, à l'heure de Paris. C'est la couche la plus basse du planning, et celle où une erreur
 * ne se voit pas : elle se compte en heures payées en trop ou en moins.
 *
 * Trois faits qu'on ne peut pas ignorer dans un service d'aide à domicile :
 *
 * 1. **Un planning se saisit en heure locale.** « Fatima vient à 9 h » veut dire 9 h à Paris —
 *    8 h UTC en hiver, 7 h UTC en été. Stocker 9 h UTC ferait dériver tous les plannings de deux
 *    heures au changement d'heure.
 * 2. **Le changement d'heure existe vraiment.** La nuit du dernier dimanche de mars, 2 h 30
 *    n'existe pas ; celle du dernier dimanche d'octobre, 2 h 30 existe deux fois. Une garde de
 *    nuit traverse ces deux nuits-là : l'une dure sept heures, l'autre neuf.
 * 3. **Aucune dépendance.** `Intl` sait tout cela, et il est dans Node. Une bibliothèque de dates
 *    en plus serait une dette pour une arithmétique de trente lignes.
 */

export const PARIS = "Europe/Paris";

const PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: PARIS,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export type ParisParts = {
  /** `YYYY-MM-DD` à Paris. */
  date: string;
  /** `HH:MM` à Paris. */
  time: string;
  /** Lundi = 1 … dimanche = 7 (ISO 8601). */
  weekday: number;
  minutesOfDay: number;
};

function readParts(instant: Date): Record<string, string> {
  return Object.fromEntries(
    PARTS.formatToParts(instant)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

/** Décalage de Paris par rapport à UTC, en minutes, à cet instant (60 en hiver, 120 en été). */
export function parisOffsetMinutes(instant: Date): number {
  const p = readParts(instant);
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour === "24" ? "0" : p.hour),
    Number(p.minute),
    Number(p.second),
  );
  return Math.round((asUtc - instant.getTime()) / 60_000);
}

/** Les composantes parisiennes d'un instant. */
export function parisParts(instant: Date): ParisParts {
  const p = readParts(instant);
  const hour = Number(p.hour === "24" ? "0" : p.hour);
  const minute = Number(p.minute);
  const date = `${p.year}-${p.month}-${p.day}`;
  return {
    date,
    time: `${String(hour).padStart(2, "0")}:${p.minute}`,
    weekday: isoWeekday(date),
    minutesOfDay: hour * 60 + minute,
  };
}

/** Lundi = 1 … dimanche = 7, pour une date `YYYY-MM-DD` (aucun fuseau en jeu : c'est un jour). */
export function isoWeekday(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  const jour = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return jour === 0 ? 7 : jour;
}

export function isDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function isTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function minutesOf(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

export function timeOf(minutes: number): string {
  const normalise = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalise / 60)).padStart(2, "0")}:${String(normalise % 60).padStart(2, "0")}`;
}

/**
 * L'instant correspondant à une date et une heure **parisiennes**.
 *
 * La résolution se fait en deux passes : on suppose un décalage, on regarde ce que cet instant
 * donne à Paris, et on corrige. Deux passes suffisent, y compris aux changements d'heure.
 *
 * Les deux cas limites, traités explicitement :
 * - **heure inexistante** (2 h 30 le dimanche du passage à l'heure d'été) : on rend l'instant du
 *   saut, c'est-à-dire 3 h 00. Une visite saisie à 2 h 30 cette nuit-là commence à 3 h.
 * - **heure ambiguë** (2 h 30 le dimanche du retour à l'heure d'hiver, qui existe deux fois) : on
 *   rend **la première**, celle d'avant le changement. C'est celle qui suit l'heure précédente du
 *   planning, et c'est ce que l'équipe de nuit vit.
 */
export function parisToInstant(date: string, time: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  const jour = 24 * 60 * 60_000;

  const matches = (instant: Date) => {
    const obtenu = parisParts(instant);
    return obtenu.date === date && obtenu.time === time;
  };

  // Les deux décalages possibles autour de cette date : celui de la veille, celui du lendemain.
  const avant = parisOffsetMinutes(new Date(naive - jour));
  const apres = parisOffsetMinutes(new Date(naive + jour));

  // Avec le décalage d'avant : c'est le cas courant, et c'est **la première** des deux heures
  // quand l'heure existe deux fois (nuit du retour à l'heure d'hiver).
  const premier = new Date(naive - avant * 60_000);
  if (matches(premier)) return premier;

  const second = new Date(naive - apres * 60_000);
  if (matches(second)) return second;

  /*
   * Aucune des deux ne donne l'heure demandée : elle n'existe pas (nuit du passage à l'heure
   * d'été). On rend **le début du saut** — 2 h 30 devient 3 h 00 — en cherchant la minute où le
   * décalage change. Six comparaisons suffisent pour une heure.
   */
  let bas = Math.min(premier.getTime(), second.getTime());
  let haut = Math.max(premier.getTime(), second.getTime());
  while (haut - bas > 60_000) {
    const milieu = bas + Math.floor((haut - bas) / 2 / 60_000) * 60_000;
    if (parisOffsetMinutes(new Date(milieu)) === apres) haut = milieu;
    else bas = milieu;
  }
  return new Date(haut);
}

/** Durée réelle, en minutes, entre deux heures parisiennes d'un même jour (fin > début). */
export function durationMinutes(
  startDate: string,
  start: string,
  endDate: string,
  end: string,
): number {
  const debut = parisToInstant(startDate, start);
  const fin = parisToInstant(endDate, end);
  return Math.round((fin.getTime() - debut.getTime()) / 60_000);
}

/** Le jour suivant une date `YYYY-MM-DD`. */
export function nextDay(date: string, days = 1): string {
  const [year, month, day] = date.split("-").map(Number);
  const instant = new Date(Date.UTC(year, month - 1, day + days));
  return instant.toISOString().slice(0, 10);
}

/** Toutes les dates de `from` à `to` inclus. */
export function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let date = from; date <= to; date = nextDay(date)) out.push(date);
  return out;
}
