import { Icon } from "@/components/ui/Icon/Icon";
import type { IconName } from "@/components/ui/Icon/icons";
import {
  RAIL_STEP_MS,
  ThreadConnector,
  ThreadKnot,
  ThreadRail,
  railItemStyle,
} from "@/components/ui/Thread/ThreadConnector";
import type { Commitment } from "@/content/schemas";
import { cn } from "@/lib/cn";
import { isProduction } from "@/lib/env";

/*
 * « Ce qui change avec Youdom Care » (docs/01 §4 bloc 3, docs/design/CONCEPT.md §3 bloc 3) :
 * chaque point renvoie à un engagement de content/engagements.json par son code. En
 * prévisualisation, tout s'affiche ; en production, un point dont l'engagement n'est pas validé
 * (ou n'existe pas) est masqué (docs/07 §7) ; sans engagement affichable, le composant rend `null`
 * (la page retire alors toute la section). Les engagements sont posés sur le fil : vertical sur
 * mobile, horizontal à partir de 64 rem (quatre cartes côte à côte), un nœud par engagement, le
 * dernier framboise ; icône 32 px facultative par engagement (`icone`).
 */

export interface CommitmentItem {
  engagement: string;
  titre: string;
  texte: string;
  /** Icône au fil (32 px) dans le nœud, à la place du numéro ; décorative. */
  icone?: IconName;
}

export function visibleCommitments(
  items: readonly CommitmentItem[],
  commitments: readonly Commitment[],
  production: boolean = isProduction(),
): CommitmentItem[] {
  if (!production) return [...items];
  const validated = new Set(commitments.filter((c) => c.valide).map((c) => c.code));
  return items.filter((item) => validated.has(item.engagement));
}

export interface CommitmentsProps {
  items: readonly CommitmentItem[];
  commitments: readonly Commitment[];
  className?: string;
  "aria-labelledby"?: string;
}

export function Commitments({ items, commitments, className, ...rest }: CommitmentsProps) {
  const shown = visibleCommitments(items, commitments);
  if (shown.length === 0) return null;
  return (
    <ThreadRail
      as="ol"
      className={cn(
        "commitments m-0 grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8",
        className,
      )}
      {...rest}
    >
      {shown.map((item, index) => {
        const last = index === shown.length - 1;
        return (
          <li
            key={item.engagement}
            data-engagement={item.engagement}
            className="t-rail__item relative max-w-none"
            style={railItemStyle(index)}
          >
            {!last ? (
              <ThreadConnector
                orientation="responsive"
                breakpoint="lg"
                delay={index * RAIL_STEP_MS + 60}
                fraction={0.2}
                className="absolute top-full left-[calc(2.75rem+1px)] h-6 w-0.5 -translate-x-1/2 sm:hidden lg:top-[calc(2.75rem+1px)] lg:left-full lg:block lg:h-0.5 lg:w-8 lg:translate-x-0 lg:-translate-y-1/2"
              />
            ) : null}
            <article className="t-rail__card flex h-full flex-col rounded-card border border-line bg-white p-6 shadow-1">
              <p className="m-0 flex items-start gap-3">
                <ThreadKnot size={40} tone={last ? "raspberry" : "teal"}>
                  {item.icone ? <Icon name={item.icone} size="sm" tone="ink" /> : index + 1}
                </ThreadKnot>
                <span className="heading-4 pt-1.5">{item.titre}</span>
              </p>
              <p className="m-0 mt-3">{item.texte}</p>
            </article>
          </li>
        );
      })}
    </ThreadRail>
  );
}
