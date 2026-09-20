import type { ComponentPropsWithoutRef, CSSProperties, ElementType } from "react";
import { cn } from "@/lib/cn";

/*
 * Couche de profondeur discrète (docs/design/BRIEF_EXPERIENCE.md §3) : translation verticale
 * liée au défilement, 24 px d'amplitude au maximum. Composant serveur, zéro JavaScript : la
 * liaison au défilement est une animation CSS pilotée par `animation-timeline: view()`, jouée
 * sur le compositeur (aucun `will-change` nécessaire, aucun écouteur `scroll`). Les navigateurs
 * qui ne la connaissent pas, le mouvement réduit et le mode confort affichent la couche immobile.
 */

export interface ParallaxProps extends ComponentPropsWithoutRef<"div"> {
  as?: "div" | "span" | "figure" | "aside";
  /**
   * Course totale de la couche en pixels pendant la traversée de l'écran, de −24 à 24.
   * Positif : la couche « retarde » sur le défilement (paraît plus loin) ; négatif : elle avance.
   */
  amount?: number;
}

export const PARALLAX_MAX_PX = 24;

export function Parallax({
  as = "div",
  amount = 16,
  className,
  style,
  children,
  ...rest
}: ParallaxProps) {
  const Tag: ElementType = as;
  const clamped = Math.max(-PARALLAX_MAX_PX, Math.min(PARALLAX_MAX_PX, amount));
  return (
    <Tag
      className={cn("m-parallax", className)}
      style={{ ...style, "--m-parallax": `${clamped}px` } as CSSProperties}
      {...rest}
    >
      {children}
    </Tag>
  );
}
