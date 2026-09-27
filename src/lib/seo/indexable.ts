/**
 * Indexation du site. Ouverte par défaut depuis la décision D-035 (demande d'Arcel du
 * 2026-09-27) : le site est indexable, y compris les pages dont la relecture professionnelle
 * est encore attendue. `SITE_INDEXABLE="false"` referme tout (utile pour une prévisualisation
 * de branche chez l'hébergeur).
 */
export function isIndexable(): boolean {
  return process.env.SITE_INDEXABLE !== "false";
}

/** Chemins jamais indexés, même une fois le site ouvert (docs/04 §2). */
export const neverIndexedPaths = ["/api/", "/merci/", "/styleguide/"] as const;
