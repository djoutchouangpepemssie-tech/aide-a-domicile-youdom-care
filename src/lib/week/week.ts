/*
 * Modèle de la semaine (docs/05 §4) : sept jours × six créneaux, partagé par la variante
 * lecture (semaines types) et la variante saisie (formulaires, P3.2).
 */

export const weekDays = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"] as const;
export type WeekDay = (typeof weekDays)[number];

export const weekSlots = ["early", "morning", "noon", "afternoon", "evening", "night"] as const;
export type WeekSlot = (typeof weekSlots)[number];

/** Heures de chaque créneau et durée en heures. */
export const slotHours: Record<WeekSlot, { from: string; to: string; duration: number }> = {
  early: { from: "6h", to: "8h", duration: 2 },
  morning: { from: "8h", to: "12h", duration: 4 },
  noon: { from: "12h", to: "14h", duration: 2 },
  afternoon: { from: "14h", to: "18h", duration: 4 },
  evening: { from: "18h", to: "21h", duration: 3 },
  night: { from: "21h", to: "6h", duration: 9 },
};

export const weekActivities = ["gestes", "repas", "sorties", "presence", "nuit"] as const;
export type WeekActivity = (typeof weekActivities)[number];

export interface WeekEntry {
  jour: WeekDay;
  creneau: WeekSlot;
  activite: WeekActivity;
  /** Horaires réels affichés, « 8h30–11h » ; sinon les heures du créneau. */
  heures?: string;
  libelle?: string;
}

const hourPattern = /^(\d{1,2})h(\d{2})?$/;

function toHours(value: string): number | null {
  const match = hourPattern.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  if (hours > 24 || minutes > 59) return null;
  return hours + minutes / 60;
}

/** Durée d'une plage « 8h30–10h » ou « 21h–6h » (passe minuit), en heures ; null si illisible. */
export function parseHours(range: string): number | null {
  const parts = range.split(/[–-]/);
  if (parts.length !== 2) return null;
  const from = toHours(parts[0] ?? "");
  const to = toHours(parts[1] ?? "");
  if (from === null || to === null) return null;
  const duration = to > from ? to - from : to + 24 - from;
  return Math.round(duration * 100) / 100;
}

export interface WeekSummary {
  hours: number;
  nights: number;
}

/** Heures hebdomadaires (horaires réels ou durée du créneau) et nombre de nuits. */
export function summarizeWeek(entries: readonly WeekEntry[]): WeekSummary {
  let hours = 0;
  let nights = 0;
  for (const entry of entries) {
    const precise = entry.heures ? parseHours(entry.heures) : null;
    hours += precise ?? slotHours[entry.creneau].duration;
    if (entry.creneau === "night") nights += 1;
  }
  return { hours: Math.round(hours), nights };
}

/** Indexe les entrées par jour puis par créneau (une entrée au plus par case). */
export function indexWeek(entries: readonly WeekEntry[]): Map<WeekDay, Map<WeekSlot, WeekEntry>> {
  const index = new Map<WeekDay, Map<WeekSlot, WeekEntry>>();
  for (const day of weekDays) index.set(day, new Map());
  for (const entry of entries) index.get(entry.jour)?.set(entry.creneau, entry);
  return index;
}
