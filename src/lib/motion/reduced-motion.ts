import { useSyncExternalStore } from "react";

/*
 * Préférence de mouvement réduit (docs/design/BRIEF_EXPERIENCE.md §2, docs/02 §5).
 * Trois sources coupent toute animation non essentielle :
 * - la media query `prefers-reduced-motion: reduce` (réglage du système) ;
 * - le mode confort de lecture, posé sur `<html data-comfort="on">` par ComfortToggle ;
 * - l'attribut de simulation `<html data-motion="reduce">`, réservé au styleguide.
 * Côté serveur la réponse est « oui » : tout est rendu visible et immobile ; l'animation n'est
 * qu'un enrichissement posé après le montage. Aucun état React n'est écrit dans un effet :
 * le hook lit une source externe (`useSyncExternalStore`).
 */

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Valeur de `data-motion` sur `<html>` qui simule la préférence (styleguide, tests manuels). */
export const MOTION_SIMULATION_VALUE = "reduce";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return true;
  const root = document.documentElement;
  if (root.dataset.comfort === "on" || root.dataset.motion === MOTION_SIMULATION_VALUE) return true;
  return window.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false;
}

/** S'abonne aux trois sources ; retourne la fonction de désabonnement. */
export function subscribeReducedMotion(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};
  const media = window.matchMedia?.(REDUCED_MOTION_QUERY);
  media?.addEventListener?.("change", onChange);
  const observer =
    typeof MutationObserver === "undefined" ? undefined : new MutationObserver(onChange);
  observer?.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-comfort", "data-motion"],
  });
  return () => {
    media?.removeEventListener?.("change", onChange);
    observer?.disconnect();
  };
}

const serverSnapshot = () => true;

/** Côté client : vrai si le mouvement doit être réduit. Vrai au rendu serveur et à l'hydratation. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, serverSnapshot);
}

/** Simulation de la préférence (styleguide) : pose ou retire `data-motion="reduce"` sur `<html>`. */
export function setSimulatedReducedMotion(on: boolean): void {
  if (typeof document === "undefined") return;
  if (on) document.documentElement.dataset.motion = MOTION_SIMULATION_VALUE;
  else delete document.documentElement.dataset.motion;
}

export function isSimulatedReducedMotion(): boolean {
  return (
    typeof document !== "undefined" &&
    document.documentElement.dataset.motion === MOTION_SIMULATION_VALUE
  );
}
