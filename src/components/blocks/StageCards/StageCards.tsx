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
 * Stades (docs/02 §7, docs/03 §2 section 4, docs/design/CONCEPT.md §3 bloc 4 et §5 section 4) :
 * trois cartes reliées par le fil réel, début · évolution · stade avancé. Liste ordonnée : l'ordre
 * de lecture reste linéaire sur mobile (empilement, fil vertical) ; fil horizontal à partir de
 * 48 rem. Le nœud framboise ferme le dernier stade ; quand un stade est actif (`active`, ou
 * `data-active` posé par le geste « Où en est la maladie ? » sur le jalon `#stade-n`), c'est lui
 * qui prend le nœud et une bordure teal-700 : « vous êtes ici ». Les trois cartes entrent à trois
 * profondeurs (translateZ 0 / 12 / 24 px) et s'alignent ; à plat en mouvement réduit.
 */

export interface Stage {
  title: string;
  text?: ReactNode;
  /** Icône au fil (32 px) à la place du numéro ; décorative. */
  icone?: IconName;
  /** Identifiant du jalon, cible d'un geste de hero (par défaut `stade-1`, `stade-2`…). */
  id?: string;
}

export interface StageCardsProps {
  stages: readonly Stage[];
  /** Identifiants des jalons, dans l'ordre (prime sur `stage.id`) ; par défaut `stade-1`, `stade-2`… */
  ids?: readonly string[];
  /** Rang (à partir de 0) du stade actif rendu côté serveur (`data-active`). */
  active?: number;
  className?: string;
  "aria-labelledby"?: string;
}

/** Profondeur d'entrée de chaque carte : 0, 12, 24 px (CONCEPT §6, « Profondeur des stades »). */
export const STAGE_DEPTH_PX = 12;

export function stageId(stage: Stage, index: number, ids?: readonly string[]): string {
  return ids?.[index] ?? stage.id ?? `stade-${index + 1}`;
}

export function StageCards({ stages, ids, active, className, ...rest }: StageCardsProps) {
  return (
    <ThreadRail
      as="ol"
      className={cn("stage-cards m-0 grid list-none gap-6 p-0 md:grid-cols-3 md:gap-8", className)}
      {...rest}
    >
      {stages.map((stage, index) => {
        const last = index === stages.length - 1;
        const isActive = active === index;
        return (
          <li
            key={stage.title}
            id={stageId(stage, index, ids)}
            data-active={isActive ? "true" : undefined}
            className="t-rail__item relative max-w-none"
            style={railItemStyle(index, index * STAGE_DEPTH_PX)}
          >
            {!last ? (
              <ThreadConnector
                orientation="responsive"
                delay={index * RAIL_STEP_MS + 60}
                fraction={0.2}
                className="absolute top-full left-[43px] h-6 w-0.5 md:top-[43px] md:left-full md:h-0.5 md:w-8"
              />
            ) : null}
            <article className="t-rail__card flex h-full flex-col rounded-card border border-line bg-white p-6 shadow-1">
              <p className="m-0 flex items-center gap-3">
                <ThreadKnot size={40} tone={last ? "raspberry" : "teal"}>
                  {stage.icone ? <Icon name={stage.icone} size="sm" tone="ink" /> : index + 1}
                </ThreadKnot>
                <span className="heading-4">{stage.title}</span>
              </p>
              {stage.text ? <div className="mt-3 [&_p]:m-0 [&_p+p]:mt-2">{stage.text}</div> : null}
            </article>
          </li>
        );
      })}
    </ThreadRail>
  );
}
