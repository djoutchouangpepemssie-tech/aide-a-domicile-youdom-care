"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { COMFORT_STORAGE_KEY } from "@/lib/comfort";

/*
 * Mode confort de lecture (docs/02 §2) : texte à 112,5 %, interlignage 1,75, encre plus foncée,
 * liens soulignés en permanence, animations coupées, fonds teintés remplacés par du blanc.
 * Les effets vivent dans tokens.css (`:root[data-comfort="on"]`) ; ce bouton pose l'attribut,
 * mémorise le choix sur l'appareil (localStorage) et tient toutes ses instances synchronisées.
 * État annoncé par `aria-pressed`. Le layout restaure le choix avant le premier rendu.
 */

const COMFORT_EVENT = "yc:confort";

export interface ComfortToggleTexts {
  libelle: string;
  description: string;
}

export interface ComfortToggleProps {
  texts: ComfortToggleTexts;
  /** `dark` : sur le pied de page (texte blanc). */
  tone?: "light" | "dark";
  /**
   * Icône seule, libellé visuellement masqué (barre de l'en-tête à partir de 80 rem, où la place
   * est comptée). Le nom accessible et l'infobulle (`title`) restent complets.
   */
  compact?: boolean;
  className?: string;
}

export function isComfortOn(): boolean {
  return typeof document !== "undefined" && document.documentElement.dataset.comfort === "on";
}

export function applyComfort(on: boolean) {
  if (on) document.documentElement.dataset.comfort = "on";
  else delete document.documentElement.dataset.comfort;
  try {
    localStorage.setItem(COMFORT_STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Stockage indisponible (navigation privée stricte) : le choix vaut pour la page seulement.
  }
  window.dispatchEvent(new CustomEvent(COMFORT_EVENT, { detail: on }));
}

/** S'abonne aux changements du mode confort (utilisé aussi par le styleguide). */
export function subscribeComfort(onChange: () => void) {
  window.addEventListener(COMFORT_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(COMFORT_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const getServerSnapshot = () => false;

export function ComfortToggle({
  texts,
  tone = "light",
  compact = false,
  className,
}: ComfortToggleProps) {
  // L'état vit sur <html> (posé avant l'hydratation par ComfortScript) : lecture externe.
  const on = useSyncExternalStore(subscribeComfort, isComfortOn, getServerSnapshot);

  return (
    <button
      type="button"
      aria-pressed={on}
      title={texts.description}
      onClick={() => applyComfort(!on)}
      className={cn(
        "inline-flex min-h-12 items-center gap-2 rounded-button border-2 font-bold transition-colors [transition-duration:var(--duration-fast)] motion-reduce:transition-none",
        compact ? "min-w-12 justify-center px-2" : "px-3",
        tone === "dark"
          ? "border-white/60 text-white hover:bg-white/10 aria-pressed:bg-white aria-pressed:text-teal-900"
          : "glass-quiet border-teal-700 text-teal-800 hover:bg-teal-50 aria-pressed:bg-teal-800 aria-pressed:text-white",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
      >
        <path d="M4 19V6a2 2 0 0 1 2-2h5v15M20 19V6a2 2 0 0 0-2-2h-5M8 9h2M15 9h2M8 13h2M15 13h2" />
      </svg>
      <span className={cn(compact && "sr-only")}>{texts.libelle}</span>
    </button>
  );
}
