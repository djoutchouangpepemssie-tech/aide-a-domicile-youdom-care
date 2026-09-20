"use client";

import {
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ElementType,
} from "react";
import { cn } from "@/lib/cn";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";

/*
 * Révélation au défilement (docs/02 §5 : fondu-montée de 12 px, 300 ms, une seule fois).
 * Petite île client : le contenu est rendu visible par le serveur ; après le montage, si le
 * mouvement est permis et si l'élément est sous le pli, l'île pose `data-reveal="pending"`
 * (CSS : opacité 0) puis `data-reveal="in"` à l'entrée dans l'écran (CSS : transition).
 * Aucun état React, aucun rendu : deux attributs posés sur le DOM. Sans JavaScript, en
 * mouvement réduit, en mode confort ou au-dessus du pli, rien n'est jamais caché.
 * Variantes : `rise` (fondu + montée), `fade`, `draw` (tracé d'un SVG au fil, 600 à 900 ms),
 * `stagger` (enfants directs révélés l'un après l'autre, 60 ms d'écart).
 */

export type RevealVariant = "rise" | "fade" | "draw" | "stagger";

export interface RevealProps extends ComponentPropsWithoutRef<"div"> {
  /** Balise conteneur selon le sens (liste pour `stagger`, figure pour `draw`…). */
  as?: "div" | "section" | "article" | "ul" | "ol" | "li" | "figure" | "p" | "span";
  variant?: RevealVariant;
  /** Délai avant la révélation, en millisecondes. */
  delay?: number;
  /** Écart entre deux enfants pour `stagger`, en millisecondes (60 par défaut). */
  stagger?: number;
  /** Part de l'élément visible pour déclencher, de 0 à 1 (0,15 par défaut). */
  threshold?: number;
}

const DRAWABLE = "path, circle, line, polyline, ellipse";

/** Vrai si l'élément est déjà (au moins en partie) dans l'écran : on ne le cache pas. */
function isOnScreen(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight;
}

function prepare(element: HTMLElement, variant: RevealVariant) {
  if (variant === "stagger") {
    Array.from(element.children).forEach((child, index) => {
      if (child instanceof HTMLElement) child.style.setProperty("--m-i", String(index));
    });
  }
  if (variant === "draw") {
    element.querySelectorAll(DRAWABLE).forEach((shape) => {
      if (!shape.hasAttribute("pathLength")) shape.setAttribute("pathLength", "1");
    });
  }
}

export function Reveal({
  as = "div",
  variant = "rise",
  delay = 0,
  stagger = 60,
  threshold = 0.15,
  className,
  style,
  children,
  ...rest
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (
      !element ||
      prefersReducedMotion() ||
      typeof IntersectionObserver === "undefined" ||
      isOnScreen(element)
    ) {
      return;
    }
    prepare(element, variant);
    element.dataset.reveal = "pending";
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          element.dataset.reveal = "in";
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      delete element.dataset.reveal;
    };
  }, [variant, threshold]);

  // Assertion plutôt qu'annotation : une annotation serait rétrécie au type union de `as`.
  const Tag = as as ElementType;
  const vars: Record<string, string> = {};
  if (delay > 0) vars["--m-delay"] = `${delay}ms`;
  if (variant === "stagger" && stagger !== 60) vars["--m-stagger"] = `${stagger}ms`;

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
