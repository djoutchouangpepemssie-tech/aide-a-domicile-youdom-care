import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

/*
 * Pastille : texte encre sur fond teinté, sauf `done` (aplat vert-500 avec texte encre, 6,13 :
 * le repère « fait » de docs/02 §2). Le vert ne porte jamais de texte blanc.
 */
export type BadgeTone = "neutral" | "teal" | "green" | "done" | "raspberry" | "azure";

export interface BadgeProps extends ComponentPropsWithoutRef<"span"> {
  tone?: BadgeTone;
}

const tones: Record<BadgeTone, string> = {
  neutral: "bg-sand text-ink",
  teal: "bg-teal-50 text-ink",
  green: "bg-green-50 text-ink",
  done: "bg-green-500 text-ink",
  raspberry: "bg-raspberry-50 text-ink",
  azure: "bg-azure-50 text-ink",
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
