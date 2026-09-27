import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

/*
 * Pastille : texte encre sur verre discret teinté (`glass-quiet` + `glass-tint-*`, D-032), sauf
 * `done` (aplat vert-500 plein avec texte encre, 6,13 : le repère « fait » de docs/02 §2, un signal
 * ne passe pas par du verre). Le vert ne porte jamais de texte blanc.
 */
export type BadgeTone = "neutral" | "teal" | "green" | "done" | "raspberry" | "azure";

export interface BadgeProps extends ComponentPropsWithoutRef<"span"> {
  tone?: BadgeTone;
}

const tones: Record<BadgeTone, string> = {
  neutral: "glass-quiet glass-tint-sable text-ink",
  teal: "glass-quiet glass-tint-teal text-ink",
  green: "glass-quiet glass-tint-green text-ink",
  done: "bg-green-500 text-ink",
  raspberry: "glass-quiet glass-tint-framboise text-ink",
  azure: "glass-quiet glass-tint-azure text-ink",
};

export function Badge({ tone = "neutral", className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-small font-bold leading-small",
        tones[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
