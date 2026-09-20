import { Icon } from "@/components/ui/Icon/Icon";
import type { IconName } from "@/components/ui/Icon/icons";
import {
  RAIL_STEP_MS,
  ThreadConnector,
  ThreadKnot,
  ThreadRail,
  railItemStyle,
} from "@/components/ui/Thread/ThreadConnector";
import type { Milestone } from "@/content/schemas";
import { cn } from "@/lib/cn";
import { isProduction } from "@/lib/env";

/*
 * « Le suivi » (docs/02 §7, docs/00 §4, docs/design/CONCEPT.md §5 section 6) : jalons de
 * engagements.json > suivi.jalons. Un jalon sans texte est masqué ; en production, un jalon non
 * validé l'est aussi (docs/07 §7). Liste ordonnée reliée par le fil réel : verticale sur mobile,
 * horizontale à partir de 48 rem ; le fil se trace à l'entrée dans l'écran, nœud framboise sur le
 * dernier jalon, icône 24 px facultative par jalon (`icons`, par moment).
 */

export function visibleMilestones(
  milestones: readonly Milestone[],
  production: boolean = isProduction(),
): (Milestone & { texte: string })[] {
  return milestones.filter(
    (milestone): milestone is Milestone & { texte: string } =>
      milestone.texte !== null && (!production || milestone.valide),
  );
}

export interface FollowUpTimelineProps {
  milestones: readonly Milestone[];
  /** Icône au fil par jalon, indexée par son `moment` (« Avant de commencer »…) ; décorative. */
  icons?: Readonly<Record<string, IconName>>;
  className?: string;
  "aria-labelledby"?: string;
}

export function FollowUpTimeline({ milestones, icons, className, ...rest }: FollowUpTimelineProps) {
  const shown = visibleMilestones(milestones);
  if (shown.length === 0) return null;

  return (
    <ThreadRail
      as="ol"
      className={cn(
        "follow-up-timeline m-0 flex list-none flex-col gap-6 p-0 md:flex-row md:gap-4",
        className,
      )}
      {...rest}
    >
      {shown.map((milestone, index) => {
        const last = index === shown.length - 1;
        const icon = icons?.[milestone.moment];
        return (
          <li
            key={`${milestone.moment}-${index}`}
            className="t-rail__item relative max-w-none flex-1 pl-10 md:pt-10 md:pl-0"
            style={railItemStyle(index)}
          >
            {/* Fil : vertical sur mobile (jusqu'au jalon suivant), horizontal sur ordinateur */}
            {!last ? (
              <ThreadConnector
                orientation="responsive"
                delay={index * RAIL_STEP_MS + 60}
                fraction={0.2}
                className="absolute top-6 bottom-[-1.5rem] left-3 w-0.5 -translate-x-1/2 md:top-3 md:right-[-1rem] md:bottom-auto md:left-6 md:h-0.5 md:w-auto md:translate-x-0 md:-translate-y-1/2"
              />
            ) : null}
            <ThreadKnot
              size={24}
              tone={last ? "raspberry" : "teal"}
              placement="absolute"
              className="top-0 left-0"
            >
              {icon ? <Icon name={icon} size="sm" tone="ink" className="size-3.5" /> : null}
            </ThreadKnot>
            <p className="m-0 font-bold">{milestone.moment}</p>
            <p className="m-0 mt-1">{milestone.texte}</p>
          </li>
        );
      })}
    </ThreadRail>
  );
}
