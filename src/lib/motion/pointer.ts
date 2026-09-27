import { cancelScheduledFrame, scheduleFrame } from "./frame";
import { MOTION_TILT_MAX_DEGREES } from "./grid";
import { prefersReducedMotion } from "./reduced-motion";

/*
 * Moteur du pointeur, partagé par `Tilt`, `HeroDepth` et `Sheen` (le reflet du verre). Il suit la
 * souris sur un élément et transmet, au rythme d'une image groupée avec tous les autres effets
 * (`lib/motion/frame`), une position normalisée de −0,5 à 0,5 sur chaque axe — convertie en degrés
 * pour l'inclinaison, en pourcentage pour le reflet.
 *
 * Chargé à la demande (`import()` au premier survol) : les îles n'embarquent que le gestionnaire
 * d'entrée, ce module ne part au client qu'avec un pointeur fin qui survole.
 *
 * Souris seulement (`pointerType === "mouse"`). Rien en mouvement réduit, en mode confort ni sous
 * la simulation du styleguide (vérifié à chaque mouvement : un changement de réglage coupe
 * aussitôt). Tout retombe à plat à la sortie du pointeur **et dès qu'un élément prend le focus au
 * clavier** (`focusin`) : le clavier annule l'effet, comme le contrat du mouvement l'exige.
 */

interface PointerFollowOptions {
  /** Reçoit la position normalisée (−0,5 à 0,5) du pointeur dans la boîte. */
  follow: (x: number, y: number) => void;
  /** Retour au repos : le pointeur est sorti, le clavier a pris la main, ou l'écoute s'arrête. */
  reset: () => void;
}

export interface PointerTiltOptions {
  /** Degrés au plus, dans les deux sens (plafonné par la grille du mouvement). */
  limit: number;
  /** Reçoit la rotation à appliquer (`rotateX`, `rotateY`), en degrés à deux décimales. */
  apply: (rotateX: string, rotateY: string) => void;
  /** Retour à plat. */
  reset: () => void;
}

export interface PointerSheenOptions {
  /** Reçoit la position du reflet en pourcentage de la boîte, à une décimale. */
  apply: (x: string, y: string) => void;
  /** Reflet au repos. */
  reset: () => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Écoute commune : une lecture de boîte par mouvement, une écriture par image, rien de plus. */
function follow(target: HTMLElement, options: PointerFollowOptions): () => void {
  let x = 0;
  let y = 0;

  const write = () => options.follow(x, y);

  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || prefersReducedMotion()) return;
    const rect = target.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    x = clamp((event.clientX - rect.left) / rect.width - 0.5, -0.5, 0.5);
    y = clamp((event.clientY - rect.top) / rect.height - 0.5, -0.5, 0.5);
    scheduleFrame(write);
  };

  const onRest = () => {
    cancelScheduledFrame(write);
    options.reset();
  };

  target.addEventListener("pointermove", onMove);
  target.addEventListener("pointerleave", onRest);
  target.addEventListener("pointercancel", onRest);
  target.addEventListener("focusin", onRest);
  return () => {
    target.removeEventListener("pointermove", onMove);
    target.removeEventListener("pointerleave", onRest);
    target.removeEventListener("pointercancel", onRest);
    target.removeEventListener("focusin", onRest);
    onRest();
  };
}

/** Inclinaison vers le pointeur. Pose les écouteurs sur `target` ; retourne le retrait. */
export function attachPointerTilt(target: HTMLElement, options: PointerTiltOptions): () => void {
  const limit = clamp(options.limit, 0, MOTION_TILT_MAX_DEGREES);
  return follow(target, {
    follow: (x, y) => options.apply((-y * 2 * limit).toFixed(2), (x * 2 * limit).toFixed(2)),
    reset: options.reset,
  });
}

/** Reflet du verre qui suit le pointeur (le style est celui de `glass-sheen`, design system). */
export function attachPointerSheen(target: HTMLElement, options: PointerSheenOptions): () => void {
  return follow(target, {
    follow: (x, y) => options.apply(((x + 0.5) * 100).toFixed(1), ((y + 0.5) * 100).toFixed(1)),
    reset: options.reset,
  });
}
