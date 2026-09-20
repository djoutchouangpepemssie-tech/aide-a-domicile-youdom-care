/*
 * Illustrations au fil (docs/02 §1) : une ligne continue dans une boîte de 120 × 120, jamais
 * fermée, jamais remplie. `main` est le tracé ; `knot` est le segment repassé en framboise
 * (le « nœud », un seul par illustration). Les tracés sont décoratifs : aucun sens ne doit
 * reposer sur eux.
 */

export interface ThreadIllustration {
  main: string;
  knot?: string;
}

export const threadIllustrations = {
  /* Maison : mur gauche, toit, mur droit, sol, porte laissée ouverte. */
  maison: {
    main: "M20 102V58L60 24l40 34v44H72V78H50v24H36",
    knot: "M50 78h22",
  },
  /* Mains : deux bras qui se rejoignent, une boucle pour l'étreinte des doigts. */
  mains: {
    main: "M10 92c8-26 26-40 44-36 8 2 12 10 8 16-6 8-14 4-12-4 2-8 12-12 20-10 18 4 30 16 40 34",
    knot: "M62 72c-6 8-14 4-12-4",
  },
  /* Tasse : rebord, flanc, fond, anse, un filet de vapeur. */
  tasse: {
    main: "M30 46h60v32c0 14-12 22-30 22S30 92 30 78V46m60 8c14 0 16 22 0 26M46 34c0-8 6-8 6-16",
    knot: "M46 34c0-8 6-8 6-16",
  },
  /* Lune : croissant ouvert, une petite étoile en nœud. */
  lune: {
    main: "M72 18C42 24 30 58 46 84c10 14 30 18 46 12C66 92 54 72 58 48c2-12 8-24 14-30M92 30l3 6",
    knot: "M92 30l3 6",
  },
  /* Cartable : rabat, corps, poignée, boucle. */
  cartable: {
    main: "M20 46h80v54H20V46m18 0V34c0-8 8-12 22-12s22 4 22 12v12M20 68h80M60 68v10",
    knot: "M60 68v10",
  },
  /* Carnet : couverture, spirale, deux lignes d'écriture. */
  carnet: {
    main: "M34 20h54v82H34V20m0 14h-10M34 50h-10M34 66h-10M34 82h-10M50 46h24M50 60h24",
    knot: "M50 46h24",
  },
} as const satisfies Record<string, ThreadIllustration>;

export type ThreadIllustrationName = keyof typeof threadIllustrations;

export const threadIllustrationNames = Object.keys(threadIllustrations) as ThreadIllustrationName[];
