import { slotHours, weekDays, weekSlots, type WeekDay, type WeekSlot } from "./week";

/*
 * Grille hebdomadaire en saisie (docs/05 §4) : sept jours × six créneaux, plusieurs choix par
 * jour. C'est le format `planning.grille` de LeadPayload (docs/05 §7). Les raccourcis
 * s'ajoutent aux créneaux déjà cochés ; seul « Tout effacer » retire. Les horaires précis
 * (`planning.plages`) sont des plages « de … à … » par pas de 30 minutes, qui peuvent passer
 * minuit ; elles se déduisent des créneaux cochés puis se modifient librement.
 */

export type WeekGrid = Partial<Record<WeekDay, WeekSlot[]>>;

export interface TimeRange {
  /** HH:MM, pas de 30 minutes. */
  debut: string;
  fin: string;
}
export type WeekRanges = Partial<Record<WeekDay, TimeRange[]>>;

export const gridShortcuts = [
  "tous",
  "semaine",
  "weekend",
  "matins",
  "nuits",
  "continu",
  "effacer",
] as const;
export type GridShortcut = (typeof gridShortcuts)[number];

const daySlots: readonly WeekSlot[] = weekSlots.filter((slot) => slot !== "night");
const weekdays: readonly WeekDay[] = ["lun", "mar", "mer", "jeu", "ven"];
const weekend: readonly WeekDay[] = ["sam", "dim"];

/** Bornes HH:MM de chaque créneau (docs/05 §4). */
export const slotRanges: Record<WeekSlot, TimeRange> = {
  early: { debut: "06:00", fin: "08:00" },
  morning: { debut: "08:00", fin: "12:00" },
  noon: { debut: "12:00", fin: "14:00" },
  afternoon: { debut: "14:00", fin: "18:00" },
  evening: { debut: "18:00", fin: "21:00" },
  night: { debut: "21:00", fin: "06:00" },
};

/** Les 48 heures possibles, de 00:00 à 23:30. */
export const halfHours: readonly string[] = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  return `${String(h).padStart(2, "0")}:${i % 2 === 0 ? "00" : "30"}`;
});

/** Ordre canonique des jours et des créneaux, sans doublon ni jour vide. */
export function normalizeGrid(grid: WeekGrid): WeekGrid {
  const out: WeekGrid = {};
  for (const day of weekDays) {
    const slots = grid[day];
    if (!slots) continue;
    const kept = weekSlots.filter((slot) => slots.includes(slot));
    if (kept.length > 0) out[day] = kept;
  }
  return out;
}

export function hasSlot(grid: WeekGrid, day: WeekDay, slot: WeekSlot): boolean {
  return grid[day]?.includes(slot) ?? false;
}

export function toggleSlot(grid: WeekGrid, day: WeekDay, slot: WeekSlot): WeekGrid {
  const current = grid[day] ?? [];
  const next = current.includes(slot) ? current.filter((s) => s !== slot) : [...current, slot];
  return normalizeGrid({ ...grid, [day]: next });
}

export function countSlots(grid: WeekGrid): number {
  return weekDays.reduce((total, day) => total + (grid[day]?.length ?? 0), 0);
}

/** Jours qui ont au moins un créneau, dans l'ordre de la semaine. */
export function activeDays(grid: WeekGrid): WeekDay[] {
  return weekDays.filter((day) => (grid[day]?.length ?? 0) > 0);
}

function fill(grid: WeekGrid, days: readonly WeekDay[], slots: readonly WeekSlot[]): WeekGrid {
  const out: WeekGrid = { ...grid };
  for (const day of days) out[day] = [...(out[day] ?? []), ...slots];
  return normalizeGrid(out);
}

export function applyShortcut(grid: WeekGrid, shortcut: GridShortcut): WeekGrid {
  switch (shortcut) {
    case "tous":
      return fill(grid, weekDays, daySlots);
    case "semaine":
      return fill(grid, weekdays, daySlots);
    case "weekend":
      return fill(grid, weekend, daySlots);
    case "matins":
      return fill(grid, weekDays, ["morning"]);
    case "nuits":
      return fill(grid, weekDays, ["night"]);
    case "continu":
      return fill(grid, weekDays, weekSlots);
    case "effacer":
      return {};
  }
}

export interface GridEstimate {
  hours: number;
  nights: number;
}

/** Heures par semaine (durée de chaque créneau, docs/05 §4) et nombre de nuits. */
export function estimateGrid(grid: WeekGrid): GridEstimate {
  let hours = 0;
  let nights = 0;
  for (const day of weekDays) {
    for (const slot of grid[day] ?? []) {
      hours += slotHours[slot].duration;
      if (slot === "night") nights += 1;
    }
  }
  return { hours, nights };
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Durée d'une plage en heures ; une plage dont la fin précède le début passe minuit. */
export function rangeHours(range: TimeRange): number {
  const start = toMinutes(range.debut);
  const end = toMinutes(range.fin);
  const minutes = end > start ? end - start : end + 24 * 60 - start;
  return minutes / 60;
}

/** Une plage compte une nuit si elle passe minuit ou commence à 21 h ou après. */
export function isNightRange(range: TimeRange): boolean {
  return toMinutes(range.fin) <= toMinutes(range.debut) || toMinutes(range.debut) >= 21 * 60;
}

export function estimateRanges(ranges: WeekRanges): GridEstimate {
  let hours = 0;
  let nights = 0;
  for (const day of weekDays) {
    for (const range of ranges[day] ?? []) {
      hours += rangeHours(range);
      if (isNightRange(range)) nights += 1;
    }
  }
  return { hours: Math.round(hours * 10) / 10, nights };
}

/** Plages d'un jour déduites de ses créneaux cochés, créneaux contigus fusionnés. */
export function rangesFromSlots(slots: readonly WeekSlot[]): TimeRange[] {
  const ordered = weekSlots.filter((slot) => slots.includes(slot));
  const out: TimeRange[] = [];
  for (const slot of ordered) {
    const range = slotRanges[slot];
    const last = out[out.length - 1];
    if (last && last.fin === range.debut) last.fin = range.fin;
    else out.push({ ...range });
  }
  return out;
}

/** Plages de toute la semaine déduites de la grille, pour amorcer les horaires précis. */
export function rangesFromGrid(grid: WeekGrid): WeekRanges {
  const out: WeekRanges = {};
  for (const day of activeDays(grid)) out[day] = rangesFromSlots(grid[day] ?? []);
  return out;
}

export function countRanges(ranges: WeekRanges): number {
  return weekDays.reduce((total, day) => total + (ranges[day]?.length ?? 0), 0);
}
