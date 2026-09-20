import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Stades (docs/02 §7, docs/03 §2 section 4) : trois cartes reliées par le fil, début · évolution ·
 * stade avancé. Liste ordonnée : l'ordre de lecture reste linéaire sur mobile (empilement).
 */

export interface Stage {
  title: string;
  text?: ReactNode;
}

export interface StageCardsProps {
  stages: readonly Stage[];
  className?: string;
  "aria-labelledby"?: string;
}

export function StageCards({ stages, className, ...rest }: StageCardsProps) {
  return (
    <ol
      className={cn("stage-cards m-0 grid list-none gap-6 p-0 md:grid-cols-3 md:gap-8", className)}
      {...rest}
    >
      {stages.map((stage, index) => {
        const last = index === stages.length - 1;
        return (
          <li key={stage.title} className="relative max-w-none">
            {!last ? (
              <span
                aria-hidden="true"
                className="absolute top-full left-8 h-6 w-0.5 bg-teal-700 md:top-8 md:left-full md:h-0.5 md:w-8"
              />
            ) : null}
            <article className="flex h-full flex-col rounded-card border border-line bg-white p-6 shadow-1">
              <p className="m-0 flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    "figure flex size-10 shrink-0 items-center justify-center rounded-full border-2 bg-white text-teal-900",
                    last ? "border-raspberry-500" : "border-teal-700",
                  )}
                >
                  {index + 1}
                </span>
                <span className="heading-4">{stage.title}</span>
              </p>
              {stage.text ? <div className="mt-3 [&_p]:m-0 [&_p+p]:mt-2">{stage.text}</div> : null}
            </article>
          </li>
        );
      })}
    </ol>
  );
}
