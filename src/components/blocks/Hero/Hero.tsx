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
import {
  heroActionsClass,
  heroGap,
  heroGapWide,
  heroLeadClamp,
  heroMediaWidth,
  heroOnlyWide,
  heroOrderLast,
  heroOrderPanel,
  heroRows,
  heroLeadPanelClass,
  heroPanelClass,
  heroTypeScale,
  heroWhenRoomy,
  heroWhenTall,
  type GlassTint,
} from "./hero-scene";
import { ScrollCue } from "./ScrollCue";

/*
 * Bannière (docs/02 §7 Hero, docs/01 §4 bloc 1, docs/design/CONCEPT.md §3 et §4, brief
 * docs/design/BRIEF_LIQUID_GLASS.md §4, décision D-032) : une scène utile, pas une affiche.
 *
 * Ce que le visiteur a sous les yeux à l'arrivée, sans défiler : le sur-titre (où je suis), le H1
 * (ce que le site fait pour lui), une phrase de promesse, **une interaction immédiate** dans un
 * panneau de verre (choix de situation, « pour qui ? », recherche de commune, aperçu d'article),
 * **une action principale** framboise, un lien secondaire, le téléphone, et un repère qui dit ce
 * qu'on trouve plus bas. La hauteur de la scène et la compaction sont dans `hero-scene.ts` ; la
 * section colorée est `HeroSection`.
 *
 * Compaction (hauteur visible, donc aussi zoom à 200 %) : à 42 rem de haut la photo, la
 * réassurance et la note se retirent et les titres rapetissent ; à 36 rem le sur-titre part, le
 * chapô tient sur deux lignes et le lien secondaire cède la place — il reste le titre, une phrase,
 * l'interaction, l'action, le téléphone et le repère. Tout en CSS : aucun décalage (CLS 0).
 *
 * Profondeur et fil (docs/design/CONCEPT.md §2, §4, §6) : autour du média, `HeroDepth` fait
 * pivoter la photo, le fil et le nœud vers le pointeur (`depth`, 4° par défaut, 2 pour les
 * aidants, 0 pour les adultes en situation de handicap) ; `HeroThread` trace le fil qui part du
 * dernier mot du H1 et pose son nœud sur la photo (`thread`, géométrie `generique` par défaut,
 * `null` pour s'en passer). Les deux ne s'activent qu'avec `media`.
 *
 * Ordre mobile : sur-titre, H1, photo en bande 16:9, chapô, interaction, actions, téléphone,
 * réassurance, note, repère. Ordinateur : grille 3fr / 2fr, la photo occupe la colonne de droite
 * (largeur plafonnée pour que la scène tienne dans la hauteur visible), le tout centré.
 *
 * Ton `sombre` (garde de nuit, présence 24h/24) : scène teal-900 posée par `HeroSection`, texte
 * blanc (contraste 8,9), textes secondaires teal-50, fil blanc, contour blanc, verre dense.
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
  /**
   * Dessin au trait affiché à droite quand la bannière n'a pas de média. `null` : rien du tout,
   * pour une bannière qui porte déjà une image de fond (27/09/2026).
   */
  illustration?: ThreadIllustrationName | null;
  /** Photo du hero (PhotoFigure 4:5, bande 16:9 sur mobile, rayon 28 px), avec son fil. */
  media?: ReactNode;
  /** Interaction immédiate (choisir sa situation, dire pour qui, chercher sa commune…). */
  gesture?: ReactNode;
  /**
   * Où vit l'interaction immédiate : dans son panneau de verre (`gesture`, par défaut) ou dans le
   * chapô (`lead`, quand le sélecteur « pour vous / pour un proche » y bascule le texte et la photo).
   */
  interaction?: "gesture" | "lead";
  /** Teinte du verre du panneau, selon le public de la page (`hero-scene.ts`). */
  tint?: GlassTint;
  /** Repère de défilement : le titre de la section suivante et son ancre. */
  cue?: { label: string; href: string };
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
  interaction = "gesture",
  tint = "teal",
  cue,
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
        "hero grid w-full grid-cols-1 gap-x-10 gap-y-0",
        "lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:grid-rows-[repeat(10,auto)]",
        heroTypeScale,
        dark && "text-white",
      )}
      data-tone={tone}
      data-hero=""
    >
      <p
        className={cn(
          heroRows.surtitle,
          heroOnlyWide,
          heroWhenRoomy,
          "m-0 text-small font-bold tracking-wide uppercase",
          dark ? "text-teal-50" : "text-teal-800",
        )}
        data-hero-surtitle=""
      >
        {surtitle}
      </p>
      <Heading level={1} className={cn(heroRows.title, heroGap)}>
        {title}
      </Heading>
      {media ? (
        <div
          className={cn(
            heroRows.media,
            // La photo n'apparaît qu'à partir de 64 rem, dans la colonne de droite, largeur
            // plafonnée : au-delà, la scène ne tiendrait plus dans la hauteur visible.
            heroOnlyWide,
            heroWhenTall,
            "hero-media relative lg:mt-0",
            heroMediaWidth,
            heroGapWide,
          )}
        >
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
      ) : illustration === null ? null : (
        <Thread
          illustration={illustration}
          tone={dark ? "dark" : "light"}
          className={cn(
            heroRows.media,
            heroOnlyWide,
            heroWhenTall,
            "order-last mx-auto mt-10 w-full max-w-sm lg:order-none lg:mt-0 lg:max-w-none",
          )}
        />
      )}
      <div
        className={cn(
          heroRows.lead,
          heroGap,
          // Le chapô ne passe sur un panneau de verre que lorsqu'il porte l'interaction ; il passe
          // alors aussi derrière l'action au dernier palier, comme les autres panneaux.
          interaction === "lead" && cn(heroLeadPanelClass(dark), heroOrderPanel),
        )}
        data-hero-interaction={interaction === "lead" ? "" : undefined}
      >
        {/* Chapô borné à deux ou trois lignes, sauf quand il porte le sélecteur de lecteur : le
            recadrage d'un texte multiligne ne doit pas toucher aux boutons qui y vivent. */}
        <Lead className={interaction === "lead" ? undefined : heroLeadClamp}>{lead}</Lead>
      </div>
      {gesture ? (
        <div
          className={cn(heroRows.panel, heroOrderPanel, heroGapWide, "lg:mt-6")}
          data-hero-interaction={interaction === "gesture" ? "" : undefined}
        >
          <div className={heroPanelClass(tint, dark)}>{gesture}</div>
        </div>
      ) : null}
      <div className={cn(heroRows.actions, heroActionsClass)}>
        <span data-hero-primary="">
          <Button href={primary.href}>{primary.label}</Button>
        </span>
        {/* Lien secondaire : à partir de 64 rem. Sous cette largeur, la barre d'action mobile porte
            déjà « Ma demande », et la hauteur visible d'un téléphone ne peut pas tout porter. */}
        <span className={cn(heroOnlyWide, heroWhenRoomy)} data-hero-secondary="">
          <Button
            href={secondary.href}
            variant="outline"
            className={dark ? "border-white text-white hover:bg-white/10" : undefined}
          >
            {secondary.label}
          </Button>
        </span>
        {/* Téléphone : à partir de 64 rem, où l'en-tête ne porte pas encore « Appeler ». Sous cette
            largeur, la barre d'action mobile le porte en permanence. */}
        {phone ? (
          <Link
            href={phone.href}
            className={cn(
              "tabular-figures inline-flex min-h-12 items-center font-bold",
              heroOnlyWide,
              heroWhenRoomy,
              link,
            )}
          >
            {phone.label}
          </Link>
        ) : null}
      </div>
      <ul
        className={cn(
          heroRows.reassurance,
          heroOnlyWide,
          heroWhenTall,
          "m-0 flex list-none flex-wrap gap-x-4 gap-y-2 p-0 text-small",
          heroGap,
          soft,
        )}
        data-hero-reassurance=""
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
        <p
          className={cn(heroRows.footnote, heroOnlyWide, heroWhenTall, "m-0 mt-2 text-small", soft)}
        >
          <Link href={footnote.href} className={link}>
            {footnote.text}
          </Link>
        </p>
      ) : null}
      {cue ? (
        <p className={cn(heroRows.cue, heroOrderLast, "m-0", heroGap)}>
          <ScrollCue label={cue.label} href={cue.href} tone={tone} />
        </p>
      ) : null}
    </div>
  );
}
