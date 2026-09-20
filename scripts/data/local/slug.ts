/*
 * Slugs et chemins des pages locales (docs/04 §4) :
 *   /aide-a-domicile/                                carte régionale
 *   /aide-a-domicile/hauts-de-seine/                 département
 *   /aide-a-domicile/hauts-de-seine/puteaux/         commune
 *   /aide-a-domicile/paris/15e-arrondissement/       arrondissement
 */

export const LOCAL_ROOT = "/aide-a-domicile/";

/** « L'Haÿ-les-Roses » → « l-hay-les-roses », « Val-d'Oise » → « val-d-oise ». */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Numéro d'un arrondissement de Paris depuis son code INSEE (75101 → 1). */
export function arrondissementNumber(code: string): number {
  if (!/^751(0[1-9]|1\d|20)$/.test(code)) throw new Error(`code d'arrondissement invalide : ${code}`);
  return Number(code.slice(3));
}

export function arrondissementOrdinal(numero: number): string {
  return numero === 1 ? "1er" : `${numero}e`;
}

/** « 1er-arrondissement », « 15e-arrondissement » (slugs de data/territoires.seed.json). */
export function arrondissementSlug(code: string): string {
  return `${arrondissementOrdinal(arrondissementNumber(code))}-arrondissement`;
}

/** Nom affiché : « Paris 15e arrondissement ». */
export function arrondissementName(code: string): string {
  return `Paris ${arrondissementOrdinal(arrondissementNumber(code))} arrondissement`;
}

export function regionPath(): string {
  return LOCAL_ROOT;
}

export function departementPath(departementSlug: string): string {
  return `${LOCAL_ROOT}${departementSlug}/`;
}

export function communePath(departementSlug: string, communeSlug: string): string {
  return `${LOCAL_ROOT}${departementSlug}/${communeSlug}/`;
}

export function arrondissementPath(code: string): string {
  return `${LOCAL_ROOT}paris/${arrondissementSlug(code)}/`;
}
