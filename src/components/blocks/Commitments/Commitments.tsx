import type { Commitment } from "@/content/schemas";
import { cn } from "@/lib/cn";
import { isProduction } from "@/lib/env";

/*
 * « Ce qui change avec Youdom Care » (docs/01 §4 bloc 3) : chaque point renvoie à un engagement
 * de content/engagements.json par son code. En prévisualisation, tout s'affiche ; en production,
 * un point dont l'engagement n'est pas validé (ou n'existe pas) est masqué (docs/07 §7).
 */

export interface CommitmentItem {
  engagement: string;
  titre: string;
  texte: string;
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
    <ol
      className={cn("commitments m-0 grid list-none gap-6 p-0 sm:grid-cols-2", className)}
      {...rest}
    >
      {shown.map((item, index) => (
        <li
          key={item.engagement}
          data-engagement={item.engagement}
          className="max-w-none rounded-card border border-line bg-white p-6 shadow-1"
        >
          <p className="m-0 flex items-start gap-3">
            <span
              aria-hidden="true"
              className="figure flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-teal-700 bg-white text-teal-900"
            >
              {index + 1}
            </span>
            <span className="heading-4 pt-1.5">{item.titre}</span>
          </p>
          <p className="m-0 mt-3">{item.texte}</p>
        </li>
      ))}
    </ol>
  );
}
