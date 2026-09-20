/*
 * Données structurées (docs/04 §2) : chaque générateur de src/lib/jsonld/ renvoie un nœud
 * schema.org complet ou `null` quand une donnée obligatoire manque. Règles : aucune valeur
 * inventée, aucun `null` sérialisé, aucune chaîne vide, aucun tableau ni objet vide. Le
 * contrôle `scripts/validate/check-schema.ts` relit chaque JSON-LD rendu.
 */

export const SCHEMA_CONTEXT = "https://schema.org";

export type JsonLdValue = string | number | boolean | null | JsonLdObject | JsonLdValue[];

export interface JsonLdObject {
  [key: string]: JsonLdValue | null | undefined;
}

export interface JsonLdNode extends JsonLdObject {
  "@context": typeof SCHEMA_CONTEXT;
  "@type": string;
}

/** Vrai si la valeur est une chaîne non vide une fois les blancs retirés. */
export function filled(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Retire récursivement tout ce qui n'a pas sa place dans un JSON-LD : `undefined`, `null`,
 * chaînes vides, tableaux et objets vides. Un objet qui se vide entièrement disparaît.
 */
export function compact<T extends JsonLdObject>(node: T): T {
  const out: JsonLdObject = {};
  for (const [key, value] of Object.entries(node)) {
    const kept = compactValue(value);
    if (kept !== undefined) out[key] = kept;
  }
  return out as T;
}

function compactValue(value: JsonLdValue | null | undefined): JsonLdValue | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value.trim().length > 0 ? value : undefined;
  if (Array.isArray(value)) {
    const items = value
      .map((item) => compactValue(item))
      .filter((item): item is JsonLdValue => item !== undefined);
    return items.length > 0 ? items : undefined;
  }
  if (typeof value === "object") {
    const object = compact(value);
    return Object.keys(object).length > 0 ? object : undefined;
  }
  return value;
}

/** Nœud racine : contexte schema.org, type, puis les champs compactés (voir `compact`). */
export function jsonLdNode(type: string, fields: JsonLdObject): JsonLdNode {
  return { "@context": SCHEMA_CONTEXT, "@type": type, ...compact(fields) };
}

/** Origine du site sans barre finale : « https://www.youdom-care.com ». */
export function siteOrigin(url: string): string {
  return url.replace(/\/+$/, "");
}

/** Adresse absolue d'un chemin interne (« /aidants/ » → « https://…/aidants/ »). */
export function absoluteUrl(pathOrUrl: string, siteUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const origin = siteOrigin(siteUrl);
  return pathOrUrl.startsWith("/") ? `${origin}${pathOrUrl}` : `${origin}/${pathOrUrl}`;
}

/** Identifiant stable de l'organisation, référencé par les autres nœuds (`provider`, `publisher`). */
export function organizationId(siteUrl: string): string {
  return `${siteOrigin(siteUrl)}/#organization`;
}
