import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

/*
 * Section de page (docs/02 §4) : `padding-block: clamp(3.5rem, 8vw, 7rem)`, conteneur 1 200 px.
 * Fonds alternés paper → white → teal-50 → paper → sand, jamais deux fonds teintés à la suite
 * (règle d'assemblage, vérifiée par les pages qui composent).
 */

export type SectionTone = "paper" | "white" | "teal" | "sand" | "green" | "dark";

const tones: Record<SectionTone, string> = {
  paper: "bg-bg",
  white: "bg-white",
  teal: "bg-tint-teal",
  sand: "bg-tint-sand",
  green: "bg-tint-green",
  dark: "bg-footer-bg text-footer-text",
};

export interface SectionProps extends ComponentPropsWithoutRef<"section"> {
  tone?: SectionTone;
  /** Sans conteneur intérieur (pour un contenu bord à bord). */
  bare?: boolean;
}

export function Section({
  tone = "paper",
  bare = false,
  className,
  children,
  ...rest
}: SectionProps) {
  return (
    <section className={cn("py-[var(--section-padding)]", tones[tone], className)} {...rest}>
      {bare ? children : <div className="container-site">{children}</div>}
    </section>
  );
}
