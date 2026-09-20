/**
 * Indexation du site. Reste fermée tant que `SITE_INDEXABLE` ne vaut pas exactement "true" :
 * la variable est lue au build et c'est Arcel qui l'ouvre en production (docs/07 §8).
 */
export function isIndexable(): boolean {
  return process.env.SITE_INDEXABLE === "true";
}

/** Chemins jamais indexés, même une fois le site ouvert (docs/04 §2). */
export const neverIndexedPaths = ["/api/", "/merci/", "/styleguide/"] as const;
