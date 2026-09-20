import { prefersReducedMotion } from "./reduced-motion";

/*
 * Moteur commun de `Tilt` et `HeroDepth` : suit la souris sur un élément et transmet, au rythme
 * de `requestAnimationFrame`, une position normalisée (−0,5 à 0,5 sur chaque axe) convertie en
 * degrés. Chargé à la demande (`import()` au premier survol) : les îles n'embarquent que le
 * gestionnaire d'entrée, ce module ne part au client qu'avec un pointeur fin qui survole.
 * Souris seulement (`pointerType === "mouse"`) ; rien en mouvement réduit, en mode confort ni
 * sous la simulation (vérifié à chaque mouvement : un changement de réglage coupe aussitôt).
 */

/** Survol possible avec un pointeur fin : la seule situation où l'inclinaison a un sens. */
export const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";

export interface PointerTiltOptions {
  /** Degrés au plus, dans les deux sens. */
  limit: number;
  /** Reçoit la rotation à appliquer (`rotateX`, `rotateY`), en degrés à deux décimales. */
  apply: (rotateX: string, rotateY: string) => void;
  /** Retour à plat : le pointeur est sorti ou l'écoute s'arrête. */
  reset: () => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Pose les écouteurs natifs sur `target` ; retourne la fonction qui les retire. */
export function attachPointerTilt(target: HTMLElement, options: PointerTiltOptions): () => void {
  const { limit, apply, reset } = options;
  let frame = 0;
  let x = 0;
  let y = 0;

  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || prefersReducedMotion()) return;
    const rect = target.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    x = clamp((event.clientX - rect.left) / rect.width - 0.5, -0.5, 0.5);
    y = clamp((event.clientY - rect.top) / rect.height - 0.5, -0.5, 0.5);
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      apply((-y * 2 * limit).toFixed(2), (x * 2 * limit).toFixed(2));
    });
  };

  const onLeave = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    reset();
  };

  target.addEventListener("pointermove", onMove);
  target.addEventListener("pointerleave", onLeave);
  target.addEventListener("pointercancel", onLeave);
  return () => {
    target.removeEventListener("pointermove", onMove);
    target.removeEventListener("pointerleave", onLeave);
    target.removeEventListener("pointercancel", onLeave);
    onLeave();
  };
}
