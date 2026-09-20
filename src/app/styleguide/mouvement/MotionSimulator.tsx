"use client";

import { useSyncExternalStore } from "react";
import {
  isSimulatedReducedMotion,
  setSimulatedReducedMotion,
  subscribeReducedMotion,
  useReducedMotion,
} from "@/lib/motion/reduced-motion";

/*
 * Outil du styleguide : simule `prefers-reduced-motion` en posant `data-motion="reduce"` sur
 * `<html>`. La feuille motion.css et les îles lisent cet attribut comme la media query.
 * État annoncé par `aria-pressed` ; lecture externe, aucun état posé dans un effet.
 */

const serverSnapshot = () => false;

export function MotionSimulator() {
  const simulated = useSyncExternalStore(
    subscribeReducedMotion,
    isSimulatedReducedMotion,
    serverSnapshot,
  );
  const reduced = useReducedMotion();

  return (
    <div className="flex flex-wrap items-center gap-4">
      <button
        type="button"
        aria-pressed={simulated}
        onClick={() => setSimulatedReducedMotion(!simulated)}
        className="inline-flex min-h-12 items-center gap-2 rounded-button border-2 border-teal-700 px-4 font-bold text-teal-800 transition-colors [transition-duration:var(--duration-fast)] hover:bg-teal-50 aria-pressed:bg-teal-800 aria-pressed:text-white motion-reduce:transition-none"
      >
        Simuler le mouvement réduit
      </button>
      <p className="m-0 text-small text-text-soft" aria-live="polite">
        Mouvement réduit effectif : <strong>{reduced ? "oui" : "non"}</strong> (réglage du système,
        mode confort ou simulation). Les révélations déjà jouées ne rejouent pas : rechargez la page
        après avoir changé le réglage.
      </p>
    </div>
  );
}
