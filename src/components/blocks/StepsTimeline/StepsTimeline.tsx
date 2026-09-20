import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Étapes numérotées reliées par le fil vertical (docs/02 §7) : liste ordonnée sémantique,
 * numéros dessinés par CSS (le lecteur d'écran lit la liste), fil teal-700 continu entre
 * les pastilles, nœud framboise sur la dernière étape.
 */

export interface Step {
  title: ReactNode;
  text: ReactNode;
}

export interface StepsTimelineProps {
  steps: readonly Step[];
  className?: string;
  /** Nom accessible de la liste (souvent le titre de la section). */
  "aria-labelledby"?: string;
}

export function StepsTimeline({ steps, className, ...rest }: StepsTimelineProps) {
  return (
    <ol className={cn("steps-timeline m-0 list-none p-0", className)} {...rest}>
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        return (
          <li key={index} className="relative max-w-none pb-8 pl-14 last:pb-0">
            {!last ? (
              <span
                aria-hidden="true"
                className="absolute top-12 bottom-0 left-6 w-0.5 -translate-x-1/2 bg-teal-700"
              />
            ) : null}
            <span
              aria-hidden="true"
              className={cn(
                "figure absolute top-0 left-0 flex size-12 items-center justify-center rounded-full border-2 bg-white text-h4 text-teal-900",
                last ? "border-raspberry-500" : "border-teal-700",
              )}
            >
              {index + 1}
            </span>
            <p className="m-0 min-h-12 pt-2.5 font-bold">{step.title}</p>
            <p className="m-0 mt-1">{step.text}</p>
          </li>
        );
      })}
    </ol>
  );
}
