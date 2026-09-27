import Image from "next/image";
import { cn } from "@/lib/cn";

/*
 * Photo d'illustration (docs/02 §6, docs/design/CONCEPT.md §2, docs/design/PHOTOS.md §8) :
 * `next/image` en `fill` dans un conteneur au ratio fixe (aspect-ratio CSS) pour un CLS nul,
 * recadrage par `object-fit: cover` et le point d'intérêt `focal` (valeur `object-position`),
 * rayon 20 px (28 px sur le hero). Le texte alternatif est obligatoire : descriptif et neutre,
 * jamais de prénom ni de légende (les photos sont des illustrations, brief D-024 §2).
 * `priority` est réservé à l'image du hero (LCP) ; tout le reste se charge à la demande. Avec
 * `priority`, next/image précharge l'image (`<link rel="preload">`) et la charge sans attendre ;
 * `fetchPriority="high"` est posé ici, sur l'image et sur son préchargement (next/image 16 ne le
 * fait pas seul) : le navigateur la fait passer avant les scripts et les polices.
 * Liseré de verre (D-032) : `glass-edge` pose un trait lumineux de 1 px en haut du cadre, qui
 * raccorde la photo aux panneaux de verre posés à côté ou par-dessus. Purement décoratif, il
 * disparaît à l'impression et ne change aucun contraste.
 * Qualité : 60 pour le hero (`priority`, l'image du LCP : docs/07 §5, mesure Lighthouse du
 * 2026-09-20), 75 ailleurs ; `quality` permet de forcer une valeur. Formats AVIF puis WebP
 * (next.config.ts). Composant serveur : aucun JavaScript côté client au-delà de `next/image`.
 */

export type PhotoRatio = "4:5" | "3:2" | "16:9";

export interface PhotoFigureProps {
  /** Chemin local sous /images/ (public/images/, crédits dans CREDITS.md). */
  src: string;
  /** Texte alternatif descriptif et neutre, jamais vide. */
  alt: string;
  /** Ratio d'affichage : 4:5 (portraits, heros), 3:2 (scènes), 16:9 (bandes). */
  ratio: PhotoRatio;
  /** Ratio en dessous de 64 rem, quand il diffère (bande 16:9 du hero mobile). */
  mobileRatio?: PhotoRatio;
  /** Point d'intérêt, valeur `object-position` (« 50% 40% ») ; centre par défaut. */
  focal?: string;
  /** Rayon : 20 px (cartes et sections) ou 28 px (hero). */
  radius?: 20 | 28;
  /** Attribut `sizes` de l'image ; par défaut la largeur du conteneur de page. */
  sizes?: string;
  /** Image du hero seulement : chargement prioritaire (LCP). */
  priority?: boolean;
  /** Qualité de compression (1 à 100) : 60 quand `priority` (hero), 75 sinon. */
  quality?: number;
  className?: string;
}

/** Qualité de l'image du hero : plus légère, elle est l'élément du LCP. */
export const HERO_QUALITY = 60;
/** Qualité des photos de section (valeur par défaut de next/image). */
export const DEFAULT_QUALITY = 75;

const ratioClasses: Record<PhotoRatio, string> = {
  "4:5": "aspect-[4/5]",
  "3:2": "aspect-[3/2]",
  "16:9": "aspect-video",
};

const desktopRatioClasses: Record<PhotoRatio, string> = {
  "4:5": "lg:aspect-[4/5]",
  "3:2": "lg:aspect-[3/2]",
  "16:9": "lg:aspect-video",
};

/** Attributs `sizes` des emplacements du site (conteneur 1 200 px, grille 3fr / 2fr du hero). */
export const photoSizes = {
  /** Colonne droite du hero (2/5 du conteneur) sur ordinateur, pleine largeur en dessous. */
  hero: "(min-width: 75rem) 480px, (min-width: 64rem) 40vw, 100vw",
  /** Moitié d'une grille à deux colonnes à partir de 48 rem. */
  half: "(min-width: 75rem) 576px, (min-width: 48rem) 50vw, 100vw",
  /** Pleine largeur du conteneur. */
  full: "(min-width: 75rem) 1200px, 100vw",
} as const;

export function PhotoFigure({
  src,
  alt,
  ratio,
  mobileRatio,
  focal = "50% 50%",
  radius = 20,
  sizes = photoSizes.full,
  priority = false,
  quality = priority ? HERO_QUALITY : DEFAULT_QUALITY,
  className,
}: PhotoFigureProps) {
  const ratios =
    mobileRatio && mobileRatio !== ratio
      ? `${ratioClasses[mobileRatio]} ${desktopRatioClasses[ratio]}`
      : ratioClasses[ratio];
  return (
    <div
      className={cn(
        "photo-figure glass-edge relative w-full overflow-hidden bg-sand",
        ratios,
        radius === 28 ? "rounded-block" : "rounded-card",
        className,
      )}
      data-ratio={ratio}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        fetchPriority={priority ? "high" : undefined}
        quality={quality}
        style={{ objectFit: "cover", objectPosition: focal }}
      />
    </div>
  );
}
