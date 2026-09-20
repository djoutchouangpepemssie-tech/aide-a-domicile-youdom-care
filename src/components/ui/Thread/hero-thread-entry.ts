/*
 * Entrée du contour du fil de hero : la seule partie de la géométrie qui dépend d'une mesure
 * faite au client (la hauteur du dernier mot du H1). Module minuscule, partagé par le registre
 * (rendu serveur) et l'île d'armement (`HeroThreadArm`), pour que les géométries elles-mêmes ne
 * partent jamais au client.
 */

const r = (value: number) => Math.round(value * 10) / 10;

/** Abscisse de l'entrée : juste à l'extérieur du bord gauche. */
export const ENTRY_X = -3;
/** Hauteur d'entrée par défaut (rendu serveur, mobile). */
export const ENTRY_Y = 16;

/** Premier segment du contour : de l'entrée (hauteur `entryY`) au bas du bord gauche. */
export function contourStart(entryY = ENTRY_Y): string {
  const y = Math.min(Math.max(entryY, 4), 76);
  const c1 = r(y + (90 - y) * 0.3);
  const c2 = r(y + (90 - y) * 0.7);
  return `M${ENTRY_X} ${r(y)}C-6 ${c1} -6 ${c2} -3 90`;
}

/** Remplace le premier segment d'un contour rendu par le serveur par celui de `entryY`. */
export function withEntry(d: string, entryY: number): string {
  return d.replace(/^M-3 [\d.]+C-6 [\d.]+ -6 [\d.]+ -3 90/, contourStart(entryY));
}
