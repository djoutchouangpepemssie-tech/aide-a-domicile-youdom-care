import Link from "next/link";
import { Tilt } from "@/components/motion/Tilt/Tilt";
import { Icon } from "@/components/ui/Icon/Icon";
import type { IconName } from "@/components/ui/Icon/icons";
import { Thread } from "@/components/ui/Thread/Thread";
import type { ThreadIllustrationName } from "@/components/ui/Thread/illustrations";
import { cn } from "@/lib/cn";

/*
 * Carte de situation (docs/02 §7, docs/01 §4 bloc 2, docs/design/CONCEPT.md §3 bloc 2) :
 * icône 48 px au fil en haut à gauche (décorative), citation en Fraunces entre guillemets, une
 * phrase, lien fléché. Toute la carte est cliquable, mais un seul lien existe pour le lecteur
 * d'écran (lien « étiré » par CSS). La carte s'incline de 3° au plus vers la souris (`Tilt`,
 * jamais au toucher ni en mouvement réduit). Sans `icon`, l'illustration au fil d'origine reste.
 */

export interface SituationCardProps {
  /** Citation, sans guillemets : le composant les ajoute. */
  quote: string;
  text: string;
  href: string;
  linkLabel: string;
  /** Icône 48 px du registre `Icon` ; prime sur `illustration`. */
  icon?: IconName;
  illustration?: ThreadIllustrationName;
  className?: string;
}

export const SITUATION_CARD_TILT = 3;

export function SituationCard({
  quote,
  text,
  href,
  linkLabel,
  icon,
  illustration = "mains",
  className,
}: SituationCardProps) {
  return (
    <Tilt
      as="article"
      max={SITUATION_CARD_TILT}
      className={cn(
        "situation-card relative flex flex-col rounded-card border border-line bg-white p-6 shadow-1",
        "transition-[box-shadow,transform] [transition-duration:var(--duration-base)] [transition-timing-function:var(--ease-out)]",
        "hover:-translate-y-0.5 hover:shadow-2 focus-within:shadow-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        className,
      )}
    >
      {icon ? (
        <Icon name={icon} size="lg" className="size-12! text-teal-700" />
      ) : (
        <Thread illustration={illustration} className="size-12 text-teal-700" />
      )}
      <p className="heading-3 m-0 mt-4 text-teal-900">« {quote} »</p>
      <p className="m-0 mt-3">{text}</p>
      <p className="m-0 mt-auto pt-4">
        <Link
          href={href}
          className="group inline-flex min-h-12 items-center gap-2 font-bold no-underline after:absolute after:inset-0 after:rounded-card after:content-['']"
        >
          {linkLabel}
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 transition-transform [transition-duration:var(--duration-base)] [transition-timing-function:var(--ease-out)] group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </p>
    </Tilt>
  );
}
