import { PAGE_THREAD_EXCLUDED } from "@/lib/motion/page-thread";

/*
 * Deux signaux posés sur `<html>` avant le premier rendu, sans lire ni écrire aucune donnée :
 * - `data-js` : JavaScript tourne. Les feuilles qui arment un tracé (hero-thread.css) ne cachent
 *   le fil qu'à cette condition, seulement hors mouvement réduit, mode confort et simulation :
 *   sans JavaScript, tout est visible d'emblée ; avec, aucun clignotement entre le HTML serveur
 *   et l'hydratation de l'île ;
 * - `data-pthread="off"` sur les chemins exclus du fil conducteur (styleguide, formulaires) : le
 *   trait statique en CSS (`main::before`, motion.css) n'y apparaît jamais, même avant
 *   l'hydratation.
 * Même mécanique que ComfortScript (script en ligne autorisé par la CSP, D-013).
 */

const excluded = PAGE_THREAD_EXCLUDED.map((prefix) => prefix.replace(/\//g, "\\/")).join("|");

const script = `var d=document.documentElement;d.dataset.js="";if(/^(${excluded})/.test(location.pathname))d.dataset.pthread="off"`;

export function MotionScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
