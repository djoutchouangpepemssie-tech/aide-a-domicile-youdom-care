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

/** Carte : fond blanc, bordure `line`, rayon 20 px, ombre 1 (docs/02 §4). */
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
        "rounded-card border border-line bg-white shadow-1",
        paddings[padding],
        interactive &&
          "transition-[box-shadow,transform] [transition-duration:var(--duration-base)] [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 hover:shadow-2 focus-within:shadow-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
