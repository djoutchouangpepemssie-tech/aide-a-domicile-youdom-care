/*
 * Fil conducteur (PageThread) : ce qui doit être partagé entre le script en ligne du layout
 * (MotionScript, qui masque le trait statique avant le premier rendu), l'île et ses tests.
 */

/** Préfixes de chemin où le fil conducteur ne s'affiche pas (styleguide, formulaires). */
export const PAGE_THREAD_EXCLUDED: readonly string[] = [
  "/styleguide/",
  "/demande/",
  "/etre-rappele/",
  "/contact/",
];

export function isPageThreadExcluded(pathname: string, exclude = PAGE_THREAD_EXCLUDED): boolean {
  return exclude.some((prefix) => pathname.startsWith(prefix));
}

/** Point de rupture du fil conducteur (64 rem). */
export const PAGE_THREAD_QUERY = "(min-width: 64rem)";
