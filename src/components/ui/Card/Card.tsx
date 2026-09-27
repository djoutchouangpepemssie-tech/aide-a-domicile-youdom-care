import type { ElementType, HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Balise conteneur selon le sens (article, li, section…). */
  as?: "div" | "article" | "section" | "li" | "aside";
  /** Survol : ombre 2 et translation de −2 px en 200 ms (docs/02 §4). */
  interactive?: boolean;
  /** Espacement intérieur : `md` = 24 px, `lg` = 32 px, `none` pour un contenu bord à bord. */
  padding?: "none" | "md" | "lg";
}

const paddings = { none: "", md: "p-6", lg: "p-8" } as const;

/**
 * Carte : verre standard (`glass`), rayon 20 px, élévation 1 (docs/02 §4 amendé par D-032).
 * Le verre vient de src/styles/glass.css : il devient opaque en mode confort et en mouvement
 * réduit, et reste opaque à 94 % sans `backdrop-filter`. Pour un fond plein, ajoutez `bg-white`
 * (les utilitaires Tailwind passent devant la classe de verre).
 */
export function Card({
  as = "div",
  interactive = false,
  padding = "md",
  className,
  children,
  ...rest
}: CardProps) {
  const Tag: ElementType = as;
  return (
    <Tag
      className={cn(
        "glass rounded-card",
        paddings[padding],
        interactive &&
          "glass-sheen transition-[box-shadow,transform] [transition-duration:var(--duration-base)] [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 hover:shadow-2 focus-within:shadow-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
