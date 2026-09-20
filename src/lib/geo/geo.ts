/*
 * Géographie minimale : distance à vol d'oiseau, agence la plus proche, recherche de commune
 * insensible aux accents. Partagé par le pipeline de données (scripts/data) et le composant
 * TerritorySearch.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

/** Distance en kilomètres (formule de haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export interface Located {
  id: string;
  coordonnees: LatLng;
}

/** Élément le plus proche d'un point ; null si la liste est vide. */
export function nearest<T extends Located>(point: LatLng, candidates: readonly T[]): T | null {
  let best: T | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const d = distanceKm(point, candidate.coordonnees);
    if (d < bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }
  return best;
}

/** « Saint-Étienne » → « saint etienne » : minuscules, sans accents, tirets et apostrophes en espaces. */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[-'’]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface CommuneRecord {
  /** Code INSEE (arrondissement de Paris : 75101 à 75120). */
  code: string;
  nom: string;
  codes_postaux: string[];
  departement: string;
  type: "commune" | "arrondissement";
  population: number | null;
  centre: LatLng | null;
  /** Identifiant de l'agence la plus proche (site.config.json > agences[].id), null si inconnu. */
  agence: string | null;
}

/** Communes dont le nom commence par la saisie (sans accents) ou dont un code postal la commence. */
export function searchCommunes(
  query: string,
  communes: readonly CommuneRecord[],
  limit = 8,
): CommuneRecord[] {
  const q = normalizeName(query);
  if (q.length === 0) return [];
  const isPostal = /^\d{2,5}$/.test(q);
  const results: CommuneRecord[] = [];
  for (const commune of communes) {
    const match = isPostal
      ? commune.codes_postaux.some((cp) => cp.startsWith(q))
      : normalizeName(commune.nom).startsWith(q) ||
        normalizeName(commune.nom)
          .split(" ")
          .some((word) => word.startsWith(q));
    if (match) results.push(commune);
    if (results.length >= limit * 4) break;
  }
  results.sort((a, b) => {
    const exactA = normalizeName(a.nom) === q ? 0 : 1;
    const exactB = normalizeName(b.nom) === q ? 0 : 1;
    if (exactA !== exactB) return exactA - exactB;
    return (b.population ?? 0) - (a.population ?? 0);
  });
  return results.slice(0, limit);
}
