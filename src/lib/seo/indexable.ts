/**
 * Indexation du site. Ouverte par défaut depuis la décision D-035 (demande d'Arcel du
 * 2026-09-27) : le site est indexable, y compris les pages dont la relecture professionnelle
 * est encore attendue. `SITE_INDEXABLE="false"` referme tout (utile pour une prévisualisation
 * de branche chez l'hébergeur).
 */
export function isIndexable(): boolean {
  return process.env.SITE_INDEXABLE !== "false";
}

/**
 * Chemins jamais indexés, même une fois le site ouvert (docs/04 §2).
 *
 * `/bureau/` : le back-office du CRM. Ce n'est pas une page du site — c'est un outil interne,
 * derrière une authentification, qui n'a rien à faire dans un moteur de recherche ni dans un plan
 * de site. Cette seule ligne le retire de `robots.txt`, des plans de site, des contrôles de
 * référencement et lui met `noindex` (MY-15).
 */
export const neverIndexedPaths = [
  "/api/",
  "/merci/",
  "/styleguide/",
  "/bureau/",
  "/terrain/",
] as const;
