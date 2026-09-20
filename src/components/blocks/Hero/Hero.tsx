import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button/Button";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { HeroDepth } from "@/components/motion/HeroDepth/HeroDepth";
import { HeroThread } from "@/components/ui/Thread/HeroThread";
import { Thread } from "@/components/ui/Thread/Thread";
import type { HeroThreadFil } from "@/components/ui/Thread/hero-threads";
import type { ThreadIllustrationName } from "@/components/ui/Thread/illustrations";
import { cn } from "@/lib/cn";

/*
 * Bannière (docs/02 §7 Hero, docs/01 §4 bloc 1, docs/design/CONCEPT.md §3 et §4) : sur-titre,
 * H1 (quatre lignes au plus sur mobile), chapô, geste d'entrée facultatif, deux boutons, lien
 * téléphone, ligne de réassurance, et un média : photo 4:5 (`media`) ou illustration au fil.
 * Un seul bouton framboise : le principal. Sur mobile (< 64 rem), il est masqué (`hidden
 * lg:contents` sur son enveloppe) : la barre mobile porte déjà « Rappel » et « Ma demande »
 * (docs/design/CONCEPT.md §3 bloc 1, §4) ; le bouton de contour et le téléphone restent visibles.
 *
 * Profondeur et fil (docs/design/CONCEPT.md §2, §4, §6) : autour du média, `HeroDepth` fait
 * pivoter la photo, le fil et le nœud vers le pointeur (`depth`, 4° par défaut, 2 pour les
 * aidants, 0 pour les adultes en situation de handicap) ; `HeroThread` trace le fil qui part du
 * dernier mot du H1 et pose son nœud sur la photo (`thread`, géométrie `generique` par défaut,
 * `null` pour s'en passer). Les deux ne s'activent qu'avec `media`.
 *
 * Ordre mobile : sur-titre, H1, photo en bande 16:9 juste sous le H1, chapô, geste, boutons,
 * téléphone, réassurance, note. Ordinateur : grille 3fr / 2fr, la photo occupe la colonne de
 * droite (rayon 28 px, posé par le média). Sans `media`, l'illustration au fil garde sa place
 * d'origine : après le texte sur mobile, à droite sur ordinateur.
 *
 * Ton `sombre` (garde de nuit, présence 24h/24) : fond teal-900 posé par la section parente,
 * texte blanc (contraste 10,3), textes secondaires teal-50 (9,2), fil blanc, contour blanc.
 */

export type HeroTone = "clair" | "sombre";

export interface HeroThreadSpec {
  /** Géométrie du fil (`generique`, `bras-lies`, `main-qui-fait`, `album`, `tasse`). */
  fil: HeroThreadFil;
  /** Position du nœud sur la photo, « x% y% » (le `focal` de la photo en général) ; centre par défaut. */
  knot?: string;
}

export interface HeroProps {
  surtitle: string;
  title: string;
  /** Chapô : texte, ou nœud (sélecteur de lecteur des pages services, docs/03 §4). */
  lead: ReactNode;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
  /** Lien téléphone ; null si le numéro est inconnu (le lien se masque). */
  phone: { label: string; href: string } | null;
  reassurance: readonly string[];
  footnote?: { text: string; href: string };
  illustration?: ThreadIllustrationName;
  /** Photo du hero (PhotoFigure 4:5, bande 16:9 sur mobile, rayon 28 px), avec son fil. */
  media?: ReactNode;
  /** Geste d'entrée (choisir sa situation, bascule de lecteur…), sous le chapô. */
  gesture?: ReactNode;
  tone?: HeroTone;
  /**
   * Rotation maximale de la scène vers le pointeur, en degrés (HeroDepth) : 4 par défaut,
   * 2 pour les aidants, 0 = aucune inclinaison (adultes en situation de handicap). Avec `media` seulement.
   */
  depth?: number;
  /**
   * Fil du hero (HeroThread) par-dessus la photo : `{ fil, knot? }` ; sans valeur, la géométrie
   * `generique` avec le nœud au centre ; `null` pour ne pas tracer de fil. Avec `media` seulement.
   */
  thread?: HeroThreadSpec | null;
}

/* Colonne de gauche sur ordinateur ; le média occupe la colonne de droite sur toutes les lignes. */
const column = "lg:col-start-1";
const mediaCell = "lg:col-start-2 lg:row-start-1 lg:row-span-8 lg:self-center";

export function Hero({
  surtitle,
  title,
  lead,
  primary,
  secondary,
  phone,
  reassurance,
  footnote,
  illustration = "maison",
  media,
  gesture,
  tone = "clair",
  depth = 4,
  thread,
}: HeroProps) {
  const dark = tone === "sombre";
  const soft = dark ? "text-teal-50" : "text-text-soft";
  const link = dark ? "text-white" : undefined;

  return (
    <div
      className={cn(
        "hero grid grid-cols-1 gap-x-10 gap-y-0 lg:grid-cols-[3fr_2fr] lg:grid-rows-[repeat(8,auto)]",
        dark && "text-white",
      )}
      data-tone={tone}
    >
      <p
        className={cn(
          column,
          "m-0 text-small font-bold tracking-wide uppercase",
          dark ? "text-teal-50" : "text-teal-800",
        )}
      >
        {surtitle}
      </p>
      <Heading level={1} className={cn(column, "mt-3")}>
        {title}
      </Heading>
      {media ? (
        <div className={cn(mediaCell, "hero-media relative mt-6 lg:mt-0")}>
          {thread === null ? (
            <HeroDepth maxDeg={depth}>{media}</HeroDepth>
          ) : (
            <HeroThread
              fil={thread?.fil ?? "generique"}
              knot={thread?.knot}
              tone={dark ? "dark" : "light"}
              depth={depth}
            >
              {media}
            </HeroThread>
          )}
        </div>
      ) : (
        <Thread
          illustration={illustration}
          tone={dark ? "dark" : "light"}
          className={cn(
            mediaCell,
            "order-last mx-auto mt-10 w-full max-w-sm lg:order-none lg:mt-0 lg:max-w-none",
          )}
        />
      )}
      <Lead className={cn(column, "mt-5")}>{lead}</Lead>
      {gesture ? <div className={cn(column, "hero-gesture mt-6")}>{gesture}</div> : null}
      <div className={cn(column, "mt-8 flex flex-wrap items-center gap-4")}>
        {/* Mobile : la barre basse porte déjà le rappel et la demande ; le principal attend 64 rem. */}
        <span className="hidden lg:contents" data-hero-primary="">
          <Button href={primary.href}>{primary.label}</Button>
        </span>
        <Button
          href={secondary.href}
          variant="outline"
          className={dark ? "border-white text-white hover:bg-white/10" : undefined}
        >
          {secondary.label}
        </Button>
      </div>
      {phone ? (
        <p className={cn(column, "m-0 mt-4")}>
          <Link
            href={phone.href}
            className={cn("tabular-figures inline-flex min-h-12 items-center font-bold", link)}
          >
            {phone.label}
          </Link>
        </p>
      ) : null}
      <ul
        className={cn(
          column,
          "m-0 mt-6 flex list-none flex-wrap gap-x-4 gap-y-2 p-0 text-small",
          soft,
        )}
      >
        {reassurance.map((item) => (
          <li key={item} className="flex max-w-none items-center gap-2">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn("shrink-0", dark ? "text-green-500" : "text-green-700")}
            >
              <path d="m5 12 5 5 9-10" />
            </svg>
            {item}
          </li>
        ))}
      </ul>
      {footnote ? (
        <p className={cn(column, "m-0 mt-2 text-small", soft)}>
          <Link href={footnote.href} className={link}>
            {footnote.text}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
