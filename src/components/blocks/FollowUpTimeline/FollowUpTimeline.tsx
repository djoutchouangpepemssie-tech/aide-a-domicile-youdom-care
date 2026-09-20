import type { Milestone } from "@/content/schemas";
import { cn } from "@/lib/cn";
import { isProduction } from "@/lib/env";

/*
 * « Le suivi » (docs/02 §7, docs/00 §4) : jalons de engagements.json > suivi.jalons.
 * Un jalon sans texte est masqué ; en production, un jalon non validé l'est aussi (docs/07 §7).
 * Liste ordonnée reliée par le fil : verticale sur mobile, horizontale à partir de 48 rem.
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
  className?: string;
  "aria-labelledby"?: string;
}

export function FollowUpTimeline({ milestones, className, ...rest }: FollowUpTimelineProps) {
  const shown = visibleMilestones(milestones);
  if (shown.length === 0) return null;

  return (
    <ol
      className={cn(
        "follow-up-timeline m-0 flex list-none flex-col gap-6 p-0 md:flex-row md:gap-4",
        className,
      )}
      {...rest}
    >
      {shown.map((milestone, index) => (
        <li
          key={`${milestone.moment}-${index}`}
          className="relative max-w-none flex-1 pl-10 md:pt-10 md:pl-0"
        >
          {/* Fil : vertical sur mobile, horizontal sur ordinateur */}
          {index < shown.length - 1 ? (
            <span
              aria-hidden="true"
              className="absolute top-6 bottom-[-1.5rem] left-3 w-0.5 -translate-x-1/2 bg-teal-700 md:top-3 md:right-[-1rem] md:bottom-auto md:left-6 md:h-0.5 md:w-auto md:translate-x-0 md:-translate-y-1/2"
            />
          ) : null}
          <span
            aria-hidden="true"
            className="absolute top-0 left-0 size-6 rounded-full border-2 border-teal-700 bg-white"
          />
          <p className="m-0 font-bold">{milestone.moment}</p>
          <p className="m-0 mt-1">{milestone.texte}</p>
        </li>
      ))}
    </ol>
  );
}
