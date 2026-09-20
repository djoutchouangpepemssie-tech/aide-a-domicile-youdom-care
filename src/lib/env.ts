/**
 * Environnement de production (docs/07 §7) : sur Vercel, `VERCEL_ENV=production`.
 * En prévisualisation et en local, les contenus non validés restent visibles.
 */
export function isProduction(): boolean {
  return process.env.VERCEL_ENV === "production";
}
