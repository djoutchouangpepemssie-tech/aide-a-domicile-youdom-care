import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";
import { Reveal, type RevealProps } from "@/components/motion/Reveal/Reveal";
import { cn } from "@/lib/cn";
import { MOTION_DURATION, MOTION_STAGGER, ms } from "@/lib/motion/grid";
import "./thread-connector.css";

/*
 * Le fil qui relie (docs/02 §1, docs/design/CONCEPT.md §2 « Il relie pour de vrai », §6
 * `fil-connecteur`). Trois briques, toutes décoratives (`aria-hidden`), sans mesure JavaScript :
 *
 * - `ThreadRail` : la liste des jalons, enveloppée par `Reveal` variante `draw`. Le fil se trace
 *   une fois à l'entrée dans l'écran ; chaque jalon (`.t-rail__item`, délai `--m-delay`) se
 *   révèle quand le tracé l'atteint (thread-connector.css). Affiché d'emblée en mouvement réduit,
 *   en mode confort et sans JavaScript.
 * - `ThreadConnector` : un segment du fil entre deux jalons. Un `<path>` de 2 px, bouts ronds,
 *   ouvert, dans une boîte de 2 × 2 étirée par `preserveAspectRatio="none"` : la géométrie vient
 *   de la position CSS que lui donne le bloc (vertical sur mobile, horizontal sur ordinateur).
 *   `vector-effect: non-scaling-stroke` garde l'épaisseur constante.
 * - `ThreadKnot` : le nœud d'un jalon, un anneau ouvert (60° laissés libres) autour d'un numéro
 *   ou d'une icône ; framboise sur le dernier jalon ou le jalon actif, teal ailleurs.
 */

/**
 * Écart entre deux jalons : le fil atteint le suivant 40 ms plus tard. Valeur de la grille du
 * mouvement (contrat, BRIEF_LIQUID_GLASS §5 : « décalage de 40 ms entre éléments d'une même
 * liste »), ramenée des 200 ms d'origine pour qu'un rail de cinq jalons tienne sous les 600 ms.
 */
export const RAIL_STEP_MS = MOTION_STAGGER;

export type ThreadOrientation = "vertical" | "horizontal" | "responsive";
export type ThreadBreakpoint = "sm" | "md" | "lg" | "container";

/*
 * Classes statiques (Tailwind ne compose pas les préfixes à l'exécution). `container` bascule sur
 * la largeur du **bloc** et non sur celle de l'écran : des cartes posées dans une demi-page
 * restaient côte à côte à trois colonnes de 218 px, où un titre de quarante-cinq caractères
 * s'étalait sur cinq lignes (27/09/2026).
 */
const orientationClasses: Record<ThreadBreakpoint, { vertical: string; horizontal: string }> = {
  sm: { vertical: "sm:hidden", horizontal: "hidden sm:block" },
  md: { vertical: "md:hidden", horizontal: "hidden md:block" },
  lg: { vertical: "lg:hidden", horizontal: "hidden lg:block" },
  container: { vertical: "@3xl:hidden", horizontal: "hidden @3xl:block" },
};

export interface ThreadConnectorProps extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
  /** `vertical` (jalons empilés), `horizontal` (côte à côte) ou `responsive` : vertical sous le point de rupture, horizontal au-delà. */
  orientation?: ThreadOrientation;
  /** Point de rupture de `responsive` (`md`, 48 rem, par défaut). */
  breakpoint?: ThreadBreakpoint;
  /** `light` : fil teal-700 (fond clair) ; `dark` : fil blanc (fond teal-900). */
  tone?: "light" | "dark";
  /** Délai du tracé en millisecondes, quand le segment est dans un `ThreadRail` (`--m-delay`). */
  delay?: number;
  /** Part de `--thread-duration` que prend ce segment (1 par défaut) : court pour un rail à plusieurs jalons. */
  fraction?: number;
}

export function ThreadConnector({
  orientation = "responsive",
  breakpoint = "md",
  tone = "light",
  delay = 0,
  fraction = 1,
  className,
  style,
  ...rest
}: ThreadConnectorProps) {
  const vars: Record<string, string> = {};
  if (delay > 0) vars["--m-delay"] = ms(delay);
  if (fraction !== 1) {
    vars.transitionDuration = `calc(var(--thread-duration, ${ms(MOTION_DURATION.draw)}) * ${fraction})`;
  }
  const paths = orientationClasses[breakpoint];
  const shape = {
    pathLength: 1,
    vectorEffect: "non-scaling-stroke" as const,
    style: vars as CSSProperties,
  };
  // Le SVG est un élément remplacé : posé en absolu avec `top` et `bottom` (ou `left` et
  // `right`), il garderait sa taille intrinsèque. Un `span` porte la position, le SVG le remplit.
  return (
    <span
      aria-hidden="true"
      data-orientation={orientation}
      className={cn(
        "t-connector pointer-events-none block",
        tone === "dark" ? "text-white" : "text-teal-700",
        className,
      )}
      style={style}
      {...rest}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 2 2"
        preserveAspectRatio="none"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="block size-full overflow-visible"
        style={{ strokeWidth: "var(--thread-width, 2px)" }}
      >
        {orientation !== "horizontal" ? (
          <path
            d="M1 0V2"
            className={orientation === "responsive" ? paths.vertical : undefined}
            {...shape}
          />
        ) : null}
        {orientation !== "vertical" ? (
          <path
            d="M0 1H2"
            className={orientation === "responsive" ? paths.horizontal : undefined}
            {...shape}
          />
        ) : null}
      </svg>
    </span>
  );
}

export type ThreadKnotTone = "teal" | "raspberry" | "white";

export interface ThreadKnotProps extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
  /** Diamètre en pixels (24, 40 ou 48 selon le bloc). */
  size?: 24 | 32 | 40 | 48;
  /** `raspberry` : le nœud (dernier jalon) ; `teal` ailleurs ; `white` sur fond sombre. */
  tone?: ThreadKnotTone;
  /** Délai du tracé de l'anneau en millisecondes (`--m-delay`). */
  delay?: number;
  /** `inline` (dans le flux, `position: relative`) ou `absolute` (posé par `className`, `top-0 left-0`…). */
  placement?: "inline" | "absolute";
  /** Numéro ou icône posé au centre ; décoratif, le texte voisin dit toujours la même chose. */
  children?: ReactNode;
}

const knotSizes: Record<NonNullable<ThreadKnotProps["size"]>, string> = {
  24: "size-6",
  32: "size-8",
  40: "size-10",
  48: "size-12",
};

const knotTones: Record<ThreadKnotTone, string> = {
  teal: "text-teal-700",
  raspberry: "text-raspberry-500",
  white: "text-white",
};

/* Anneau ouvert : de midi, dans le sens des aiguilles, jusqu'à 300° ; 60° restent libres. */
const KNOT_RING = "M12 1A11 11 0 1 1 2.47 6.5";

export function ThreadKnot({
  size = 40,
  tone = "teal",
  delay = 0,
  placement = "inline",
  className,
  style,
  children,
  ...rest
}: ThreadKnotProps) {
  const vars: Record<string, string> = {};
  if (delay > 0) vars["--m-delay"] = ms(delay);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "t-knot shrink-0 items-center justify-center rounded-full bg-white",
        placement === "absolute" ? "absolute flex" : "relative inline-flex",
        knotSizes[size],
        knotTones[tone],
        className,
      )}
      style={{ ...style, ...vars } as CSSProperties}
      {...rest}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute inset-0 size-full overflow-visible"
        style={{ strokeWidth: "var(--thread-width, 2px)" }}
      >
        <path d={KNOT_RING} pathLength={1} vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="figure relative text-teal-900">{children}</span>
    </span>
  );
}

export interface ThreadRailProps extends Omit<RevealProps, "variant" | "as"> {
  as?: "ol" | "ul" | "div";
}

/** Liste de jalons reliés par le fil : `Reveal` variante `draw` plus les règles du rail. */
export function ThreadRail({ as = "ol", className, ...rest }: ThreadRailProps) {
  return <Reveal as={as} variant="draw" className={cn("t-rail", className)} {...rest} />;
}

/** Style d'un jalon de rail : délai de révélation et profondeur facultative. */
export function railItemStyle(index: number, depth = 0): CSSProperties {
  const vars: Record<string, string> = {};
  if (index > 0) vars["--m-delay"] = ms(index * RAIL_STEP_MS);
  if (depth > 0) vars["--t-depth"] = `${depth}px`;
  return vars as CSSProperties;
}
