/*
 * Géométries du fil de hero (docs/design/CONCEPT.md §2 « Il signe le hero », §4, §6 `fil-hero`).
 * Le tracé vit dans la boîte de la photo, en unités relatives (0 à 100 en largeur et en hauteur,
 * `preserveAspectRatio="none"` : la même géométrie épouse le 4:5 d'ordinateur et la bande 16:9
 * de mobile ; `vector-effect: non-scaling-stroke` garde 2 px). Il entre par le bord gauche
 * (`entry`, à la hauteur du dernier mot du H1 quand l'île l'a mesurée, 16 sinon), descend le
 * long de la photo, l'entoure à demi (le bas, jamais le tour complet), puis rejoint le nœud posé
 * sur le point d'intérêt (`kx`, `ky`, en pourcentage). Le trait qui part du dernier mot du H1
 * jusqu'à l'entrée est mesuré par l'île (HeroThread) : il n'est pas ici.
 * Jamais fermé (`Z` interdit), jamais rempli, jamais porteur d'une information.
 */

export type HeroThreadFil = "generique" | "bras-lies" | "main-qui-fait" | "album" | "tasse";

export interface HeroThreadGeometry {
  /** Point d'entrée par défaut du tracé, sur le bord gauche de la photo (unités relatives). */
  entry: readonly [number, number];
  /** Tracé complet, de l'entrée (à la hauteur `entryY`, 16 par défaut) au nœud (`kx`, `ky`). */
  main: (kx: number, ky: number, entryY?: number) => string;
}

const r = (value: number) => Math.round(value * 10) / 10;

/** Abscisse de l'entrée : juste à l'extérieur du bord gauche. */
export const ENTRY_X = -3;
/** Hauteur d'entrée par défaut (rendu serveur, mobile). */
export const ENTRY_Y = 16;
const ENTRY: readonly [number, number] = [ENTRY_X, ENTRY_Y];

/** Demi-contour commun : bord gauche légèrement à l'extérieur, angle arrondi, bord bas. */
const contour = (toX: number, entryY = ENTRY_Y) => {
  const y = Math.min(Math.max(entryY, 4), 76);
  const c1 = r(y + (90 - y) * 0.3);
  const c2 = r(y + (90 - y) * 0.7);
  return `M${ENTRY_X} ${r(y)}C-6 ${c1} -6 ${c2} -3 90Q-2 103 8 103L${r(toX)} 103`;
};

export const heroThreads: Record<HeroThreadFil, HeroThreadGeometry> = {
  /* Générique : le bas de la photo, puis une montée souple vers le nœud. */
  generique: {
    entry: ENTRY,
    main: (kx, ky, entryY) =>
      `${contour(Math.min(46, kx - 8), entryY)}C${r(kx - 2)} 103 ${r(kx - 18)} ${r(ky + 26)} ${r(kx)} ${r(ky)}`,
  },
  /* Bras liés (accueil) : une petite boucle entrelacée juste avant le nœud. */
  "bras-lies": {
    entry: ENTRY,
    main: (kx, ky, entryY) =>
      `${contour(Math.min(44, kx - 10), entryY)}C${r(kx - 6)} 103 ${r(kx - 18)} ${r(ky + 20)} ${r(kx - 8)} ${r(ky + 6)}` +
      "c2 -9 12 -9 12 -2c0 5 -8 6 -8 0c0 -3 2 -4 4 -4",
  },
  /* La main qui fait (personnes âgées) : deux vaguelettes, comme des doigts, avant le nœud. */
  "main-qui-fait": {
    entry: ENTRY,
    main: (kx, ky, entryY) =>
      `${contour(Math.min(40, kx - 12), entryY)}C${r(kx - 8)} 103 ${r(kx - 22)} ${r(ky + 26)} ${r(kx - 12)} ${r(ky + 10)}` +
      "c2 -4 5 -4 6 0c1 3 4 3 6 0c1 -3 1 -6 0 -10",
  },
  /* Album (neuro) : le fil arrive par la droite, comme une page qu'on tourne. */
  album: {
    entry: ENTRY,
    main: (kx, ky, entryY) =>
      `${contour(60, entryY)}C82 103 ${r(kx + 18)} ${r(ky + 14)} ${r(kx + 10)} ${r(ky + 2)}c-2 -4 -6 -4 -10 -2`,
  },
  /* Tasse (adultes, aidants) : la vapeur est le fil, il redescend sur la tasse. */
  tasse: {
    entry: ENTRY,
    main: (kx, ky, entryY) =>
      `${contour(Math.min(40, kx - 10), entryY)}C${r(kx + 4)} 103 ${r(kx + 16)} ${r(ky - 32)} ${r(kx + 6)} ${r(ky - 16)}` +
      "c-4 5 4 9 -2 14c-1 1 -3 2 -4 2",
  },
};

export const heroThreadNames = Object.keys(heroThreads) as HeroThreadFil[];

/** Lit un point d'intérêt « 62% 48% » (format `focal` de PhotoFigure) ; centre par défaut. */
export function parseKnot(knot: string | undefined): readonly [number, number] {
  const match = /^\s*([\d.]+)%\s+([\d.]+)%\s*$/.exec(knot ?? "");
  if (!match) return [50, 50];
  const clamp = (value: string) => Math.min(92, Math.max(8, Number.parseFloat(value)));
  return [clamp(match[1] ?? "50"), clamp(match[2] ?? "50")];
}
