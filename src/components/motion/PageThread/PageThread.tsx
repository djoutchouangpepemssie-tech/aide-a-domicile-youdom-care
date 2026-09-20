"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";

/*
 * Le fil conducteur (docs/design/CONCEPT.md §2 « Il devient conducteur », §6 `fil-conducteur`) :
 * à partir de 64 rem, une colonne de 48 px à gauche du contenu porte un trait vertical continu
 * (teal-700, 2 px) qui grandit avec le défilement, et un nœud framboise à la hauteur de chaque
 * H2 de `main`. Tout le mouvement est en CSS (motion.css : `animation-timeline: scroll()` pour
 * le trait, dont la pointe suit la ligne de lecture à 55 % de l'écran, `view()` pour chaque
 * nœud ; trait complet et nœuds noués sans prise en charge, en mouvement réduit, en mode
 * confort). L'île ne fait que mesurer : position et hauteur de `main`, ce qui reste dessous,
 * hauteur de chaque H2 visible, remesurées quand le document change de taille (ResizeObserver),
 * à la redimension, au chargement des polices et à chaque changement de page. Rien n'est rendu
 * côté serveur ni sur mobile, rien n'est mesuré sous 64 rem. Décoratif : `aria-hidden`, hors du
 * flux, sans pointeur. Aucune page n'est modifiée : le composant est monté une fois dans le
 * layout racine et se retire lui-même sur le styleguide et les pages de formulaire.
 */

/** Préfixes de chemin où le fil conducteur ne s'affiche pas (styleguide, formulaires). */
export const PAGE_THREAD_EXCLUDED: readonly string[] = [
  "/styleguide/",
  "/demande/",
  "/etre-rappele/",
  "/contact/",
];

export interface PageThreadProps {
  /** Sélecteur du conteneur mesuré (`main` par défaut). */
  root?: string;
  /** Sélecteur des titres qui reçoivent un nœud, dans le conteneur (`h2` par défaut). */
  headings?: string;
  /** Préfixes de chemin exclus ; `[]` pour forcer l'affichage (styleguide). */
  exclude?: readonly string[];
}

interface Layout {
  top: number;
  height: number;
  /** Ce qui reste sous le conteneur (pied de page) : le trait finit au bas de `main`, pas du document. */
  below: number;
  knots: number[];
}

const WIDE = "(min-width: 64rem)";

/* Anneau ouvert (60° laissés libres), comme ThreadKnot : le nœud se noue, il ne se ferme pas. */
const KNOT_RING = "M6 1A5 5 0 1 1 1.67 3.5";

/** Ordonnée du nœud d'un titre : le milieu de sa première ligne. */
function knotOffset(heading: Element, rect: DOMRect): number {
  const lineHeight = Number.parseFloat(getComputedStyle(heading).lineHeight);
  const first = Number.isFinite(lineHeight) ? Math.min(lineHeight, rect.height) : rect.height;
  return first / 2;
}

export function measurePage(root: string, headings: string): Layout | null {
  const container = document.querySelector(root);
  if (!container) return null;
  const box = container.getBoundingClientRect();
  if (box.height === 0) return null;
  const top = box.top + window.scrollY;
  const knots: number[] = [];
  container.querySelectorAll(headings).forEach((heading) => {
    const rect = heading.getBoundingClientRect();
    // Titres masqués (panneau replié, `sr-only`) : ni hauteur ni largeur, pas de nœud.
    if (rect.height < 2 || rect.width < 2) return;
    knots.push(Math.round(rect.top + window.scrollY - top + knotOffset(heading, rect)));
  });
  const below = Math.max(0, document.documentElement.scrollHeight - (top + box.height));
  return { top: Math.round(top), height: Math.round(box.height), below: Math.round(below), knots };
}

export function PageThread({
  root = "main",
  headings = "h2",
  exclude = PAGE_THREAD_EXCLUDED,
}: PageThreadProps) {
  const pathname = usePathname();
  const excluded = exclude.some((prefix) => pathname.startsWith(prefix));
  const [layout, setLayout] = useState<Layout | null>(null);

  useEffect(() => {
    if (excluded) return;
    const wide = window.matchMedia(WIDE);
    let frame = 0;
    const measure = () => {
      frame = 0;
      setLayout(wide.matches ? measurePage(root, headings) : null);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const observer =
      typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(schedule);
    observer?.observe(document.body);
    window.addEventListener("resize", schedule);
    wide.addEventListener?.("change", schedule);
    document.fonts?.ready.then(schedule, () => {});
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", schedule);
      wide.removeEventListener?.("change", schedule);
      setLayout(null);
    };
  }, [pathname, excluded, root, headings]);

  if (!layout) return null;
  return (
    <div
      aria-hidden="true"
      className="m-pthread"
      data-knots={layout.knots.length}
      style={
        {
          "--m-pt-top": `${layout.top}px`,
          "--m-pt-height": `${layout.height}px`,
          "--m-pt-below": `${layout.below}px`,
        } as CSSProperties
      }
    >
      <span className="m-pthread__line" />
      {layout.knots.map((y, index) => (
        <svg
          key={`${index}-${y}`}
          className="m-pthread__knot"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          style={{ top: y }}
        >
          <path d={KNOT_RING} pathLength={1} />
        </svg>
      ))}
    </div>
  );
}
