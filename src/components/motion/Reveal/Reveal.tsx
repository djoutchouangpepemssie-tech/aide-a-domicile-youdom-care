"use client";

import {
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ElementType,
} from "react";
import { cn } from "@/lib/cn";
import { MOTION_DURATION, MOTION_STAGGER, ms } from "@/lib/motion/grid";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";
import { isOnScreen, observeOnce } from "@/lib/motion/viewport";

/*
 * Révélation au défilement (contrat du mouvement, BRIEF_LIQUID_GLASS §5 : 250 à 400 ms, décalage
 * de 40 ms entre éléments d'une même liste, une seule fois).
 *
 * Petite île client : le contenu est rendu visible par le serveur ; après le montage, si le
 * mouvement est permis et si l'élément est sous le pli, l'île pose `data-reveal="pending"`
 * (CSS : opacité 0) puis `data-reveal="in"` à l'entrée dans l'écran (CSS : transition).
 * Aucun état React, aucun rendu : deux attributs posés sur le DOM. Sans JavaScript, en
 * mouvement réduit, en mode confort ou au-dessus du pli, rien n'est jamais caché.
 *
 * Coût : aucun observateur propre. Le seuil est confié à la fabrique partagée
 * (`lib/motion/viewport`), qui n'ouvre qu'un `IntersectionObserver` par seuil pour toute la page et
 * retire l'élément dès sa première entrée dans l'écran. La question du pli est posée au même
 * module, qui mesure tous les `.m-reveal` de la page en une seule passe : aucune lecture de mise
 * en page entrelacée avec une écriture.
 *
 * Variantes : `rise` (fondu + montée), `fade`, `draw` (tracé d'un SVG au fil), `stagger` (enfants
 * directs révélés l'un après l'autre).
 */

export type RevealVariant = "rise" | "fade" | "draw" | "stagger";

export interface RevealProps extends ComponentPropsWithoutRef<"div"> {
  /** Balise conteneur selon le sens (liste pour `stagger`, figure pour `draw`…). */
  as?: "div" | "section" | "article" | "ul" | "ol" | "li" | "figure" | "p" | "span";
  variant?: RevealVariant;
  /** Délai avant la révélation, en millisecondes. */
  delay?: number;
  /** Écart entre deux enfants pour `stagger`, en millisecondes (40 par défaut). */
  stagger?: number;
  /** Part de l'élément visible pour déclencher, de 0 à 1 (0,15 par défaut). */
  threshold?: number;
}

const DRAWABLE = "path, circle, line, polyline, ellipse";

/** Famille mesurée d'un coup pour savoir qui est sous le pli. */
const GROUP = ".m-reveal";

function prepare(element: HTMLElement, variant: RevealVariant) {
  if (variant === "stagger") {
    Array.from(element.children).forEach((child, index) => {
      if (child instanceof HTMLElement) child.style.setProperty("--m-i", String(index));
    });
  }
  if (variant === "draw") {
    // Durée du tracé posée par l'île, donc seulement quand le mouvement est permis : en mouvement
    // réduit et en mode confort, le jeton CSS reste à 0 ms.
    element.style.setProperty("--thread-duration", ms(MOTION_DURATION.draw));
    element.querySelectorAll(DRAWABLE).forEach((shape) => {
      if (!shape.hasAttribute("pathLength")) shape.setAttribute("pathLength", "1");
    });
  }
}

export function Reveal({
  as = "div",
  variant = "rise",
  delay = 0,
  stagger = MOTION_STAGGER,
  threshold = 0.15,
  className,
  style,
  children,
  ...rest
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || prefersReducedMotion() || typeof IntersectionObserver === "undefined") return;
    if (isOnScreen(element, GROUP)) return;
    prepare(element, variant);
    element.dataset.reveal = "pending";
    const unobserve = observeOnce(element, threshold, () => {
      element.dataset.reveal = "in";
    });
    return () => {
      unobserve();
      delete element.dataset.reveal;
    };
  }, [variant, threshold]);

  // Assertion plutôt qu'annotation : une annotation serait rétrécie au type union de `as`.
  const Tag = as as ElementType;
  const vars: Record<string, string> = {};
  if (delay > 0) vars["--m-delay"] = ms(delay);
  if (variant === "stagger") vars["--m-stagger"] = ms(stagger);

  return (
    <Tag
      ref={ref}
      className={cn("m-reveal", `m-reveal--${variant}`, className)}
      style={{ ...style, ...vars } as CSSProperties}
      {...rest}
    >
      {children}
    </Tag>
  );
}
