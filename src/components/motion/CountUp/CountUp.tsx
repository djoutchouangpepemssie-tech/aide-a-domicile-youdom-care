"use client";

import { useEffect, useRef, type ComponentPropsWithoutRef, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";

/*
 * Compteur pour un chiffre sourcé (docs/design/BRIEF_EXPERIENCE.md §3). Le serveur rend la
 * valeur finale ; une copie `sr-only` la garde lisible par les lecteurs d'écran pendant que la
 * copie visible (aria-hidden) se compte de 0 à la valeur en 900 ms (`requestAnimationFrame`,
 * sortie en cube), déclenchée une seule fois à l'apparition. Chiffres tabulaires et largeur
 * réservée : aucun décalage de mise en page. En mouvement réduit, la valeur finale reste affichée.
 * Le chiffre reste un fait sourcé : le composant ne l'invente pas, il l'affiche.
 */

export interface CountUpProps extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
  value: number;
  /** Durée du comptage en millisecondes (900 par défaut). */
  duration?: number;
  /** Nombre de décimales affichées (0 par défaut). */
  decimals?: number;
  /** Texte placé avant ou après le nombre, lu une seule fois (« + », « % », « € »…). */
  prefix?: string;
  suffix?: string;
  locale?: string;
}

export const COUNT_UP_DURATION = 900;

export function formatCount(value: number, decimals = 0, locale = "fr-FR"): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
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
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        let start: number | undefined;
        const step = (now: number) => {
          start ??= now;
          const progress = duration > 0 ? Math.min((now - start) / duration, 1) : 1;
          element.textContent = formatCount(value * easeOutCubic(progress), decimals, locale);
          if (progress < 1) frame = requestAnimationFrame(step);
        };
        element.textContent = formatCount(0, decimals, locale);
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.5 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
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
