import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon/Icon";
import type { IconName } from "@/components/ui/Icon/icons";
import {
  RAIL_STEP_MS,
  ThreadConnector,
  ThreadKnot,
  ThreadRail,
  railItemStyle,
} from "@/components/ui/Thread/ThreadConnector";
import { cn } from "@/lib/cn";

/*
 * Étapes reliées par le fil vertical (docs/02 §7, docs/design/CONCEPT.md §3 bloc 6) : liste
 * ordonnée sémantique, numéros ou icônes dessinés dans le nœud (le lecteur d'écran lit la liste),
 * segments du fil réel entre les nœuds, nœud framboise sur la dernière étape. Le fil se trace à
 * l'entrée dans l'écran et chaque étape se révèle quand le trait l'atteint ; tout est visible
 * d'emblée sans JavaScript ou en mouvement réduit.
 */

export interface Step {
  title: ReactNode;
  text: ReactNode;
  /** Icône au fil (24 px) à la place du numéro ; décorative. */
  icone?: IconName;
}

export interface StepsTimelineProps {
  steps: readonly Step[];
  className?: string;
  /** Nom accessible de la liste (souvent le titre de la section). */
  "aria-labelledby"?: string;
}

export function StepsTimeline({ steps, className, ...rest }: StepsTimelineProps) {
  return (
    <ThreadRail as="ol" className={cn("steps-timeline m-0 list-none p-0", className)} {...rest}>
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        return (
          <li
            key={index}
            className="t-rail__item relative max-w-none pb-8 pl-14 last:pb-0"
            style={railItemStyle(index)}
          >
            {!last ? (
              <ThreadConnector
                orientation="vertical"
                delay={index * RAIL_STEP_MS + 60}
                fraction={0.2}
                className="absolute top-12 bottom-0 left-6 w-0.5 -translate-x-1/2"
              />
            ) : null}
            <ThreadKnot
              size={48}
              tone={last ? "raspberry" : "teal"}
              placement="absolute"
              className="top-0 left-0 text-h4"
            >
              {step.icone ? <Icon name={step.icone} size="md" tone="ink" /> : index + 1}
            </ThreadKnot>
            <p className="m-0 min-h-12 pt-2.5 font-bold">{step.title}</p>
            <p className="m-0 mt-1">{step.text}</p>
          </li>
        );
      })}
    </ThreadRail>
  );
}
