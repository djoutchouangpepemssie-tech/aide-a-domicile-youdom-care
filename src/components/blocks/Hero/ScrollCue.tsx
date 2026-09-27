import { cn } from "@/lib/cn";
import type { HeroTone } from "./Hero";

/*
 * Repère de défilement (brief docs/design/BRIEF_LIQUID_GLASS.md §4) : une ligne courte qui dit ce
 * qu'on trouve plus bas — le titre de la section suivante, mot pour mot — et une flèche.
 *
 * C'est un lien d'ancre vers cette section : il fonctionne au clavier, sans JavaScript, et il
 * n'est jamais la seule indication (la section existe, elle est nommée et atteignable par le
 * défilement comme par le plan du site). La flèche descend de 3 px au survol et au focus, en
 * `transform` seulement, annulée en mouvement réduit et en mode confort (`--duration-base` à 0) :
 * aucune animation infinie, aucun décalage de mise en page.
 */

export interface ScrollCueProps {
  /** Ce qu'on trouve plus bas : le titre de la section visée, tel qu'il est écrit. */
  label: string;
  /** Ancre de la section (`#situations`, `#reponse`, `#essentiel`…). */
  href: string;
  tone?: HeroTone;
  className?: string;
}

export function ScrollCue({ label, href, tone = "clair", className }: ScrollCueProps) {
  const dark = tone === "sombre";
  return (
    <a
      href={href}
      data-hero-cue=""
      className={cn(
        "hero-cue group inline-flex min-h-11 items-center gap-2 text-small font-bold no-underline hover:underline",
        dark ? "text-teal-50" : "text-teal-800",
        className,
      )}
    >
      <span>{label}</span>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          "hero-cue__arrow shrink-0 transition-transform [transition-duration:var(--duration-base)]",
          "[transition-timing-function:var(--ease-out)] group-hover:translate-y-[3px]",
          "group-focus-visible:translate-y-[3px] motion-reduce:transition-none",
        )}
      >
        <path d="M12 5v14M6 13l6 6 6-6" />
      </svg>
    </a>
  );
}
