import { distanceKm, type LatLng } from "../../../src/lib/geo/geo";
import { type DepartementCode, PARIS_COMMUNE } from "./geo-api";

/*
 * Sélection de la vague 1 (docs/04 §4, data/territoires.seed.json > regle_vague_1) :
 * - communes des agences (Paris 12e compte pour Paris : l'arrondissement 75112) ;
 * - les 8 communes les plus peuplées de chaque département hors Paris ;
 * - toute commune dont le centre est à moins de 5 km à vol d'oiseau d'une agence ;
 * - les 20 arrondissements de Paris.
 * Puis : agence la plus proche et communes voisines par distance réelle.
 */

export interface TerritoryCommune {
  code: string;
  nom: string;
  departement: DepartementCode;
  type: "commune" | "arrondissement";
  population: number | null;
  centre: LatLng | null;
}

export interface Agency {
  id: string;
  /** Code INSEE de la commune ou de l'arrondissement qui accueille l'agence. */
  code_insee: string;
  departement: string;
  coordonnees: LatLng;
}

export type WaveMotif = "commune-agence" | "arrondissement" | "population" | "proximite";

export interface WaveOptions {
  topByDepartement?: number;
  radiusKm?: number;
}

/** Communes de la vague 1 avec leur motif (priorité : agence > arrondissement > population > proximité). */
export function selectWave1(
  communes: readonly TerritoryCommune[],
  agencies: readonly Agency[],
  options: WaveOptions = {},
): Map<string, WaveMotif> {
  const topN = options.topByDepartement ?? 8;
  const radius = options.radiusKm ?? 5;
  const selected = new Map<string, WaveMotif>();
  const set = (code: string, motif: WaveMotif) => {
    if (!selected.has(code)) selected.set(code, motif);
  };

  const agencyCodes = new Set(agencies.map((a) => a.code_insee));
  for (const c of communes) {
    if (c.code === PARIS_COMMUNE) continue;
    if (agencyCodes.has(c.code)) set(c.code, "commune-agence");
  }
  for (const c of communes) {
    if (c.type === "arrondissement") set(c.code, "arrondissement");
  }
  const byDepartement = new Map<string, TerritoryCommune[]>();
  for (const c of communes) {
    if (c.type !== "commune" || c.departement === "75") continue;
    const list = byDepartement.get(c.departement) ?? [];
    list.push(c);
    byDepartement.set(c.departement, list);
  }
  for (const list of byDepartement.values()) {
    list
      .filter((c) => c.population !== null)
      .sort((a, b) => (b.population ?? 0) - (a.population ?? 0) || a.code.localeCompare(b.code))
      .slice(0, topN)
      .forEach((c) => set(c.code, "population"));
  }
  for (const c of communes) {
    if (c.type !== "commune" || c.code === PARIS_COMMUNE || !c.centre) continue;
    const centre = c.centre;
    if (agencies.some((a) => distanceKm(centre, a.coordonnees) < radius)) set(c.code, "proximite");
  }
  return selected;
}

export interface NearestAgency {
  id: string;
  distance_km: number;
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function nearestAgency(point: LatLng, agencies: readonly Agency[]): NearestAgency | null {
  let best: NearestAgency | null = null;
  for (const a of agencies) {
    const d = distanceKm(point, a.coordonnees);
    if (!best || d < best.distance_km) best = { id: a.id, distance_km: d };
  }
  return best ? { id: best.id, distance_km: round1(best.distance_km) } : null;
}

/**
 * Agence d'un département : celle qui y est implantée, sinon la plus proche du chef-lieu ;
 * la distance est mesurée depuis le centre du chef-lieu.
 */
export function departementAgency(
  departement: string,
  chefLieuCentre: LatLng | null,
  agencies: readonly Agency[],
): NearestAgency | null {
  const local = agencies.find((a) => a.departement === departement);
  if (local) {
    return {
      id: local.id,
      distance_km: chefLieuCentre ? round1(distanceKm(chefLieuCentre, local.coordonnees)) : 0,
    };
  }
  return chefLieuCentre ? nearestAgency(chefLieuCentre, agencies) : null;
}

export interface Neighbour {
  code: string;
  nom: string;
  distance_km: number;
}

/** Les `limit` communes ou arrondissements les plus proches (Paris 75056 exclu). */
export function nearestNeighbours(
  origin: TerritoryCommune,
  communes: readonly TerritoryCommune[],
  limit = 8,
): Neighbour[] {
  if (!origin.centre) return [];
  const centre = origin.centre;
  const candidates: Neighbour[] = [];
  for (const c of communes) {
    if (c.code === origin.code || c.code === PARIS_COMMUNE || !c.centre) continue;
    candidates.push({ code: c.code, nom: c.nom, distance_km: distanceKm(centre, c.centre) });
  }
  candidates.sort((a, b) => a.distance_km - b.distance_km || a.code.localeCompare(b.code));
  return candidates.slice(0, limit).map((n) => ({ ...n, distance_km: round1(n.distance_km) }));
}
