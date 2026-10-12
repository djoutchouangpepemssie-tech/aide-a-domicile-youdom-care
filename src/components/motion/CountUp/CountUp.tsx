"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
} from "react";
import { cn } from "@/lib/cn";
import { MOTION_MAX_DURATION } from "@/lib/motion/grid";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";
import { observeOnce } from "@/lib/motion/viewport";

/*
 * Compteur pour un chiffre sourcé (docs/design/BRIEF_EXPERIENCE.md §3). La valeur se compte de 0
 * à sa valeur exacte en 600 ms (`requestAnimationFrame`, sortie en cube), une seule fois à
 * l'apparition, par la fabrique d'observateurs partagée. La dernière image écrit la valeur
 * exacte, jamais un arrondi. Chiffres tabulaires et largeur réservée : aucun décalage de mise en
 * page. En mouvement réduit, la valeur finale reste affichée. Le chiffre reste un fait sourcé :
 * le composant ne l'invente pas, il l'affiche.
 *
 * **Le rendu statique ne contient la valeur qu'UNE fois (D-065).** Jusqu'au 12/10/2026, le
 * serveur rendait deux copies — la copie visible en `aria-hidden`, et une copie `sr-only` pour
 * les lecteurs d'écran. À l'œil et au lecteur d'écran, c'était juste ; mais le *texte* de la page
 * valait « 4545 » pour un total de 45 heures. Relevé par l'audit du 12/10/2026 sur une centaine
 * de pages (« environ 5151 heures par semaine ») : c'est ce texte que lisent un moteur de
 * recherche, un extrait de résultat et tout ce qui analyse la page.
 *
 * Le dédoublement n'existe donc plus que **côté client, et seulement quand l'animation a
 * réellement lieu** : `animated` ne passe à vrai que dans l'effet, c'est-à-dire avec JavaScript,
 * hors mouvement réduit et avec un `IntersectionObserver`. Sans animation, il n'y a qu'un nombre,
 * sans `aria-hidden` : le lecteur d'écran lit la vraie valeur, le moteur aussi.
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
  /*
   * Vrai uniquement côté client, et seulement quand le comptage va avoir lieu. Le premier rendu
   * du client est donc identique à celui du serveur (pas d'écart d'hydratation) ; l'effet le fait
   * basculer ensuite, et c'est ce basculement qui ajoute la copie `sr-only` et masque la copie
   * animée aux lecteurs d'écran — pour la durée de l'animation, pas dans le HTML livré.
   */
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || prefersReducedMotion() || typeof IntersectionObserver === "undefined") return;
    setAnimated(true);
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
        /* Masqué aux lecteurs d'écran seulement pendant qu'il se compte : voir `animated`. */
        aria-hidden={animated ? "true" : undefined}
        className="m-count__digits"
        style={{ "--m-count-width": `${final.length}ch` } as CSSProperties}
      >
        {final}
      </span>
      {animated ? <span className="sr-only">{final}</span> : null}
      {suffix}
    </span>
  );
}
