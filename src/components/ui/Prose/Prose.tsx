import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@/lib/cn";

export interface ProseProps extends ComponentPropsWithoutRef<"div"> {
  /** Balise conteneur : `div` par défaut, `article` ou `section` selon le sens. */
  as?: Extract<ElementType, "div" | "article" | "section">;
}

/**
 * Texte courant long : mesure de 60 à 72 caractères, rythme vertical, listes, citations,
 * tableaux réels (docs/02 §3). Les styles vivent dans globals.css (`.prose`).
 */
export function Prose({ as: Tag = "div", className, children, ...rest }: ProseProps) {
  return (
    <Tag className={cn("prose", className)} {...rest}>
      {children}
    </Tag>
  );
}
