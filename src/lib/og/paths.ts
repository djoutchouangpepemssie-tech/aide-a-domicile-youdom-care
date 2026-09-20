/*
 * Adresses des images Open Graph servies par Route Handler. Les pages services vivent sous le
 * segment attrape-tout src/app/[...chemin]/, qui ne peut contenir aucun fichier de métadonnées
 * (« Catch-all must be the last part of the URL ») : leur image est donc rendue par
 * src/app/og/[...chemin]/route.tsx et la page la déclare via `pageMetadata({ image })`.
 */

export const OG_ROUTE_PREFIX = "/og";

/** Chemin local de l'image Open Graph d'une page service (« /aidants/ » → « /og/aidants/ »). */
export function serviceOgImagePath(chemin: string): string {
  const trimmed = chemin.replace(/^\/+|\/+$/g, "");
  return trimmed.length > 0 ? `${OG_ROUTE_PREFIX}/${trimmed}/` : `${OG_ROUTE_PREFIX}/`;
}
