import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card/Card";
import { Heading, type HeadingLevel } from "@/components/ui/Heading/Heading";
import { cn } from "@/lib/cn";

/*
 * Carte d'aide financière (docs/02 §7) : pour qui, combien, comment la demander, lien vers la
 * source officielle signalé comme externe. Les montants et conditions viennent des sources
 * ouvertes en P2.7, avec leur année : le composant ne porte aucun chiffre.
 */

export interface AidCardTexts {
  pour_qui: string;
  combien: string;
  comment: string;
  lien_externe: string;
}

export interface AidCardProps {
  name: string;
  forWho: ReactNode;
  /** Absent tant que le montant n'a pas été repris d'une source officielle datée (P2.7). */
  howMuch?: ReactNode;
  howTo: ReactNode;
  official: { label: string; href: string };
  /** Lien interne vers la page détaillée de l'aide. */
  detail?: { label: string; href: string };
  /** Niveau du titre selon la page (3 par défaut). */
  headingLevel?: HeadingLevel;
  texts: AidCardTexts;
  className?: string;
}

export function AidCard({
  name,
  forWho,
  howMuch,
  howTo,
  official,
  detail,
  headingLevel = 3,
  texts,
  className,
}: AidCardProps) {
  return (
    <Card as="article" className={cn("aid-card flex flex-col", className)}>
      <Heading level={headingLevel} visual={4}>
        {name}
      </Heading>
      <dl className="m-0 mt-3 grid gap-3">
        <div>
          <dt className="text-small font-bold text-teal-900">{texts.pour_qui}</dt>
          <dd className="m-0">{forWho}</dd>
        </div>
        {howMuch !== undefined ? (
          <div>
            <dt className="text-small font-bold text-teal-900">{texts.combien}</dt>
            <dd className="m-0">{howMuch}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-small font-bold text-teal-900">{texts.comment}</dt>
          <dd className="m-0">{howTo}</dd>
        </div>
      </dl>
      {detail ? (
        <p className="m-0 mt-4">
          <Link href={detail.href} className="inline-flex min-h-12 items-center font-bold">
            {detail.label}
          </Link>
        </p>
      ) : null}
      {/*
       * 27/09/2026, demande d'Arcel : plus aucun lien sortant vers un service public. Le nom de
       * la source officielle reste affiché — le lecteur sait d'où vient l'information et peut la
       * retrouver — mais la carte ne l'envoie plus ailleurs.
       */}
      <p className="m-0 mt-auto pt-4 text-small text-text-soft [overflow-wrap:anywhere]">
        {official.label}
      </p>
    </Card>
  );
}
