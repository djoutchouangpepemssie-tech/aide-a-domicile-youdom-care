/*
 * Signale, avant le premier rendu, que JavaScript tourne : `<html data-js>`. Les feuilles qui
 * arment un tracé (hero-thread.css) ne cachent le fil qu'à cette condition, seulement hors
 * mouvement réduit, mode confort et simulation : sans JavaScript, tout est visible d'emblée ;
 * avec, aucun clignotement entre le HTML serveur et l'hydratation de l'île. Même mécanique que
 * ComfortScript (script en ligne autorisé par la CSP, D-013), aucune donnée lue ni écrite.
 */

const script = "document.documentElement.dataset.js=''";

export function MotionScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
