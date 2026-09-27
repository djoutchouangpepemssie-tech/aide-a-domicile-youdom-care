"use client";

import { useEffect, useRef, type ComponentPropsWithoutRef, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { MOTION_MAX_DURATION } from "@/lib/motion/grid";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";
import { observeOnce } from "@/lib/motion/viewport";

/*
 * Compteur pour un chiffre sourcé (docs/design/BRIEF_EXPERIENCE.md §3). Le serveur rend la
 * valeur finale ; une copie `sr-only` la garde lisible par les lecteurs d'écran pendant que la
 * copie visible (aria-hidden) se compte de 0 à la valeur en 600 ms (`requestAnimationFrame`,
 * sortie en cube), déclenchée une seule fois à l'apparition, par la fabrique d'observateurs
 * partagée. La dernière image écrit la valeur exacte, jamais un arrondi. Chiffres tabulaires et
 * largeur réservée : aucun décalage de mise en page. En mouvement réduit, la valeur finale reste
 * affichée. Le chiffre reste un fait sourcé : le composant ne l'invente pas, il l'affiche.
 */

export interface CountUpProps extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
  value: number;
  /** Durée du comptage en millisecondes (600 par défaut, plafond du contrat du mouvement). */
  duration?: number;
  /** Nombre de décimales affichées (0 par défaut). */
  decimals?: number;
  /** Texte placé avant ou après le nombre, lu une seule fois (« + », « % », « € »…). */
  prefix?: string;
  suffix?: string;
  locale?: string;
}

export const COUNT_UP_DURATION = MOTION_MAX_DURATION;

/* Un formateur par couple (langue, décimales) : en construire un par image coûtait cher. */
const formatters = new Map<string, Intl.NumberFormat>();

function formatter(decimals: number, locale: string): Intl.NumberFormat {
  const key = `${locale}/${decimals}`;
  const known = formatters.get(key);
  if (known) return known;
  const created = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  formatters.set(key, created);
  return created;
}

export function formatCount(value: number, decimals = 0, locale = "fr-FR"): string {
  return formatter(decimals, locale).format(value);
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

export function CountUp({
  value,
  duration = COUNT_UP_DURATION,
  decimals = 0,
  prefix,
  suffix,
  locale = "fr-FR",
  className,
  ...rest
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const final = formatCount(value, decimals, locale);

  useEffect(() => {
    const element = ref.current;
    if (!element || prefersReducedMotion() || typeof IntersectionObserver === "undefined") return;
    let frame = 0;
    const unobserve = observeOnce(element, 0.5, () => {
      let start: number | undefined;
      const step = (now: number) => {
        start ??= now;
        const progress = duration > 0 ? Math.min((now - start) / duration, 1) : 1;
        if (progress < 1) {
          element.textContent = formatCount(value * easeOutCubic(progress), decimals, locale);
          frame = requestAnimationFrame(step);
          return;
        }
        // Dernière image : la valeur exacte, celle du rendu serveur, jamais un calcul arrondi.
        frame = 0;
        element.textContent = final;
      };
      element.textContent = formatCount(0, decimals, locale);
      frame = requestAnimationFrame(step);
    });
    return () => {
      unobserve();
      cancelAnimationFrame(frame);
      element.textContent = final;
    };
  }, [value, duration, decimals, locale, final]);

  return (
    <span className={cn("m-count", className)} {...rest}>
      {prefix}
      <span
        ref={ref}
        aria-hidden="true"
        className="m-count__digits"
        style={{ "--m-count-width": `${final.length}ch` } as CSSProperties}
      >
        {final}
      </span>
      <span className="sr-only">{final}</span>
      {suffix}
    </span>
  );
}
