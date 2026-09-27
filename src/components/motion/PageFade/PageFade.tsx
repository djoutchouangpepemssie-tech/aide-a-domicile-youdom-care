"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
import { MOTION_DURATION, MOTION_EASE_OUT } from "@/lib/motion/grid";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";

/*
 * Fondu entre deux pages (contrat du mouvement, BRIEF_LIQUID_GLASS §5 : « fondu court sur le
 * contenu principal, jamais sur l'en-tête »). Île sans rendu, montée une fois par `MotionScript`
 * dans le layout.
 *
 * Ce qui bouge : l'opacité de `main`, 150 ms, courbe `--ease-out`. Rien d'autre. L'en-tête, la
 * barre d'action et le pied de page ne clignotent pas ; le défilement n'est pas touché (Next gère
 * la restauration) ; aucune propriété de mise en page n'est animée, donc CLS 0.
 *
 * Quand : seulement au changement de chemin, jamais au premier affichage — une page qui s'ouvre en
 * fondu retarderait son LCP. L'opacité de départ est posée dans un effet de mise en page, donc
 * avant la peinture : le contenu de la nouvelle page n'apparaît jamais avant de disparaître.
 *
 * Repli sans effet : en mouvement réduit, en mode confort, sous la simulation du styleguide, ou
 * dans un navigateur sans `Element.animate` (l'API des animations web), rien n'est joué — la page
 * change d'un coup, ce qui est le comportement attendu. Les transitions de vue de Next 16
 * (`experimental.viewTransition`) demanderaient `next.config.ts` et `layout.tsx` : quand elles
 * seront activées, ce fondu pourra leur céder la place (voir docs/design/MOUVEMENT.md §3).
 */

/** Durée du fondu, en millisecondes. */
export const PAGE_FADE_DURATION = MOTION_DURATION.page;

/** Effet de mise en page côté client, effet simple au rendu serveur (aucun DOM à toucher). */
const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function PageFade() {
  const pathname = usePathname();
  const seen = useRef<string | null>(null);
  const playing = useRef<Animation | null>(null);

  useBeforePaint(() => {
    // Le chemin déjà vu (premier affichage, effet rejoué à l'identique en mode strict, mise à jour
    // à chaud) ne déclenche rien : seul un changement de page se fond.
    if (seen.current === null || seen.current === pathname) {
      seen.current = pathname;
      return;
    }
    seen.current = pathname;
    if (prefersReducedMotion()) return;
    const main = document.querySelector<HTMLElement>("main");
    if (!main || typeof main.animate !== "function") return;
    playing.current?.cancel();
    // Posé avant la peinture : la nouvelle page part de l'invisible, sans clignotement.
    main.style.opacity = "0";
    const animation = main.animate(
      { opacity: [0, 1] },
      { duration: PAGE_FADE_DURATION, easing: MOTION_EASE_OUT, fill: "forwards" },
    );
    playing.current = animation;
    // L'opacité en ligne est retirée dès la fin **et** en cas d'annulation (départ de la page
    // avant la fin du fondu) : `main` ne peut jamais rester invisible.
    const clear = () => {
      main.style.removeProperty("opacity");
      if (playing.current === animation) playing.current = null;
    };
    animation.addEventListener("cancel", clear, { once: true });
    animation.addEventListener(
      "finish",
      () => {
        clear();
        animation.cancel();
      },
      { once: true },
    );
  }, [pathname]);

  useEffect(() => {
    return () => {
      playing.current?.cancel();
      playing.current = null;
    };
  }, []);

  return null;
}
