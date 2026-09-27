/*
 * Grille du mouvement — une seule source pour les durées, les courbes et les amplitudes.
 *
 * Contrat (docs/design/BRIEF_LIQUID_GLASS.md §5, décision D-032) :
 * - entrée : une seule séquence de moins de 600 ms, opacité et translation de 8 px au plus ;
 * - révélation au défilement : 250 à 400 ms, décalage de 40 ms entre éléments d'une même liste ;
 * - pointeur : 150 ms, 2° d'inclinaison au plus, annulé au clavier et en mouvement réduit ;
 * - entre deux pages : fondu court sur le contenu principal, jamais sur l'en-tête ;
 * - aucune animation infinie, aucun décalage de mise en page.
 *
 * Ces valeurs doublent les jetons CSS de `src/styles/tokens.css` (`--duration-*`, `--ease-out`) :
 * le JavaScript en a besoin pour les animations qu'il pilote (fondu de page, compteur) et pour
 * les jetons qu'une île pose elle-même, seulement quand le mouvement est permis. En mouvement
 * réduit, en mode confort et sous la simulation du styleguide, les jetons CSS valent 0 ms et
 * aucune île ne pose de durée : rien ne bouge.
 */

/** Durées en millisecondes, du geste le plus court à l'entrée la plus longue. */
export const MOTION_DURATION = {
  /** Pression d'un bouton (enfoncement à 95 %). */
  press: 100,
  /** Suivi du pointeur : reflet du verre, inclinaison d'une carte. */
  pointer: 150,
  /** Fondu du contenu principal entre deux pages. */
  page: 150,
  /** Changement d'état d'un composant : survol, focus, activation. */
  state: 200,
  /** Révélation d'un bloc au défilement (fondu-montée, cascade d'une liste). */
  reveal: 300,
  /** Tracé d'un fil au défilement (illustration, rail de jalons). */
  draw: 400,
  /** Entrée du hero : une seule séquence, sous les 600 ms du contrat. */
  entry: 560,
} as const;

export type MotionDurationName = keyof typeof MOTION_DURATION;

/** Décalage entre deux éléments d'une même liste (contrat §5 : 40 ms). */
export const MOTION_STAGGER = 40;

/** Aucune animation du site ne dépasse cette durée, délai compris (contrat §5). */
export const MOTION_MAX_DURATION = 600;

/** Courbe unique de toutes les entrées et sorties (`--ease-out`, docs/02 §5). */
export const MOTION_EASE_OUT = "cubic-bezier(0.2, 0.7, 0.2, 1)";

/** Inclinaison maximale vers le pointeur, en degrés (contrat §5 : 2° au plus). */
export const MOTION_TILT_MAX_DEGREES = 2;

/** Échelle d'un bouton enfoncé (classe `m-press`). */
export const MOTION_PRESS_SCALE = 0.95;

/** Translation d'une entrée, en pixels (contrat §5 : 8 px au plus). */
export const MOTION_RISE_PX = 8;

/**
 * Survol possible avec un pointeur fin : la seule situation où un effet de pointeur a un sens.
 * Vit ici, dans le module sans dépendance, pour que les coquilles (`Tilt`, `HeroDepth`, `Sheen`)
 * puissent le lire sans embarquer le moteur du pointeur, qu'elles chargent à la demande.
 */
export const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";

/** Durée en millisecondes formatée pour une propriété CSS. */
export function ms(duration: number): string {
  return `${duration}ms`;
}
