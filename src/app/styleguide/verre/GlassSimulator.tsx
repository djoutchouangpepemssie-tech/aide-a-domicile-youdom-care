"use client";

import { useSyncExternalStore } from "react";
import {
  applyComfort,
  isComfortOn,
  subscribeComfort,
} from "@/components/ui/ComfortToggle/ComfortToggle";

/*
 * Outil du styleguide : deux simulations, sans rien changer au site.
 *  - « repli » pose `data-glass="fallback"` sur `<html>` : src/styles/glass.css retire alors le
 *    `backdrop-filter` et passe les surfaces à 94 % d'opacité, comme dans un navigateur qui ne
 *    prend pas le flou en charge (`@supports not (backdrop-filter: blur(1px))`) ;
 *  - « mode confort » appelle le même code que le bouton du site : verre et scènes deviennent
 *    opaques, les teintes claires deviennent blanches, les reflets disparaissent.
 * La simulation du mouvement réduit vit sur /styleguide/mouvement/ ; elle a le même effet que le
 * mode confort sur le verre et les scènes.
 */

const FALLBACK_EVENT = "yc:verre-repli";

function isFallbackOn(): boolean {
  return typeof document !== "undefined" && document.documentElement.dataset.glass === "fallback";
}

function applyFallback(on: boolean) {
  if (on) document.documentElement.dataset.glass = "fallback";
  else delete document.documentElement.dataset.glass;
  window.dispatchEvent(new CustomEvent(FALLBACK_EVENT));
}

function subscribeFallback(onChange: () => void) {
  window.addEventListener(FALLBACK_EVENT, onChange);
  return () => window.removeEventListener(FALLBACK_EVENT, onChange);
}

const serverSnapshot = () => false;

const buttonClasses =
  "inline-flex min-h-12 items-center gap-2 rounded-button border-2 border-teal-700 px-4 font-bold " +
  "text-teal-800 transition-colors [transition-duration:var(--duration-fast)] hover:bg-teal-50 " +
  "aria-pressed:bg-teal-800 aria-pressed:text-white motion-reduce:transition-none";

export function GlassSimulator() {
  const fallback = useSyncExternalStore(subscribeFallback, isFallbackOn, serverSnapshot);
  const comfort = useSyncExternalStore(subscribeComfort, isComfortOn, serverSnapshot);

  return (
    <div className="flex flex-wrap items-center gap-4">
      <button
        type="button"
        aria-pressed={fallback}
        onClick={() => applyFallback(!fallback)}
        className={buttonClasses}
      >
        Simuler l’absence de backdrop-filter
      </button>
      <button
        type="button"
        aria-pressed={comfort}
        onClick={() => applyComfort(!comfort)}
        className={buttonClasses}
      >
        Mode confort de lecture
      </button>
      <p className="m-0 text-small text-text-soft" aria-live="polite">
        Repli : <strong>{fallback ? "oui" : "non"}</strong> · mode confort :{" "}
        <strong>{comfort ? "oui" : "non"}</strong>. Le repli garde les surfaces opaques à 94 % ; le
        mode confort les rend totalement opaques et efface reflets, halos, grain et dégradés.
      </p>
    </div>
  );
}
