import {
  activeDays,
  applyShortcut,
  countRanges,
  countSlots,
  estimateGrid,
  estimateRanges,
  normalizeGrid,
  rangesFromSlots,
  type GridEstimate,
  type WeekGrid,
  type WeekRanges,
} from "@/lib/week/grid";
import { slotHours, weekDays, weekSlots, type WeekDay, type WeekSlot } from "@/lib/week/week";
import type { Duration, NightKind, Rhythm, Urgency } from "./forms";
import type { LeadPlanning } from "./schema";

/*
 * État de l'étape « planning » d'un formulaire (docs/05 §4) et sa conversion vers
 * `LeadPayload.planning` (docs/05 §7, étendu par D-020). Le composant WeekPlannerInput
 * manipule cet état ; ce module reste pur pour être testé et réutilisé côté serveur.
 */

export const MAX_DATES = 60;

export interface PlanningValue {
  rythme: Rhythm | null;
  grille: WeekGrid;
  /** Horaires précis activés : `plages` fait foi pour l'estimation. */
  precis: boolean;
  plages: WeekRanges;
  /** Ponctuel : dates demandées (AAAA-MM-JJ, triées, uniques). */
  dates: string[];
  /** Ponctuel : créneaux communs à toutes les dates. */
  creneaux: WeekSlot[];
  /** 24h/24 : tous les jours (null tant que la question n'a pas de réponse). */
  tousLesJours: boolean | null;
  /** 24h/24 : date de début souhaitée (AAAA-MM-JJ). */
  debut: string | null;
  /** 24h/24 : durée envisagée. */
  duree: Duration | null;
  nuit: NightKind | null;
  /** Date de début souhaitée : l'`urgence` de LeadPayload. */
  urgence: Urgency | null;
}

export const emptyPlanning: PlanningValue = {
  rythme: null,
  grille: {},
  precis: false,
  plages: {},
  dates: [],
  creneaux: [],
  tousLesJours: null,
  debut: null,
  duree: null,
  nuit: null,
  urgence: null,
};

/** Plages alignées sur les jours cochés : conservées si elles existent, déduites sinon. */
export function syncRanges(grille: WeekGrid, plages: WeekRanges): WeekRanges {
  const out: WeekRanges = {};
  for (const day of activeDays(grille)) {
    const existing = plages[day];
    out[day] = existing && existing.length > 0 ? existing : rangesFromSlots(grille[day] ?? []);
  }
  return out;
}

const isoDay = /^\d{4}-\d{2}-\d{2}$/;

/** Dates uniques, triées, au format AAAA-MM-JJ, au plus MAX_DATES. */
export function normalizeDates(dates: readonly string[]): string[] {
  return [...new Set(dates.filter((d) => isoDay.test(d)))].sort().slice(0, MAX_DATES);
}

/** Toutes les dates d'une période, bornes comprises ; vide si la période est incohérente. */
export function expandPeriod(from: string, to: string): string[] {
  if (!isoDay.test(from) || !isoDay.test(to) || to < from) return [];
  const out: string[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor <= end && out.length < MAX_DATES) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

/** Grille 24h/24 : tous les créneaux sur les jours demandés (tous, ou ceux déjà présents). */
export function continuousGrid(days: readonly WeekDay[]): WeekGrid {
  const grid: WeekGrid = {};
  for (const day of days) grid[day] = [...weekSlots];
  return normalizeGrid(grid);
}

export function planningEstimate(value: PlanningValue): GridEstimate {
  switch (value.rythme) {
    case "regulier":
    case "24h":
      return value.precis ? estimateRanges(value.plages) : estimateGrid(value.grille);
    case "ponctuel": {
      const perDate = value.creneaux.reduce((sum, slot) => sum + slotHours[slot].duration, 0);
      const nightsPerDate = value.creneaux.includes("night") ? 1 : 0;
      return { hours: perDate * value.dates.length, nights: nightsPerDate * value.dates.length };
    }
    default:
      return { hours: 0, nights: 0 };
  }
}

export function needsNightQuestion(value: PlanningValue): boolean {
  return planningEstimate(value).nights > 0;
}

/** Répond à « Tous les jours ? » : remplit la grille d'office (docs/05 §4), modifiable ensuite. */
export function chooseEveryDay(value: PlanningValue, all: boolean): PlanningValue {
  const days = all ? weekDays : activeDays(value.grille).length > 0 ? activeDays(value.grille) : [];
  return { ...value, tousLesJours: all, grille: continuousGrid(days), precis: false, plages: {} };
}

export function toLeadPlanning(value: PlanningValue): LeadPlanning | undefined {
  if (value.rythme === null) return undefined;
  const planning: LeadPlanning = { rythme: value.rythme };
  const { hours } = planningEstimate(value);
  if (value.rythme === "regulier" || value.rythme === "24h") {
    if (value.precis && countRanges(value.plages) > 0) planning.plages = value.plages;
    else if (countSlots(value.grille) > 0) planning.grille = value.grille;
    if (hours > 0) planning.heuresParSemaine = hours;
    if (needsNightQuestion(value) && value.nuit) planning.nuit = value.nuit;
  }
  if (value.rythme === "24h") {
    if (value.debut) planning.dates = [value.debut];
    if (value.duree) planning.duree = value.duree;
  }
  if (value.rythme === "ponctuel") {
    if (value.dates.length > 0) planning.dates = normalizeDates(value.dates);
    if (value.creneaux.length > 0) planning.creneaux = value.creneaux;
    if (needsNightQuestion(value) && value.nuit) planning.nuit = value.nuit;
  }
  return planning;
}

export { applyShortcut };
