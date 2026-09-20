"use client";

import { usePathname } from "next/navigation";
import { lazy, Suspense, useEffect, useState } from "react";
import {
  isPageThreadExcluded,
  PAGE_THREAD_EXCLUDED,
  PAGE_THREAD_QUERY,
} from "@/lib/motion/page-thread";

/*
 * Le fil conducteur (docs/design/CONCEPT.md §2 « Il devient conducteur », §6 `fil-conducteur`) :
 * à partir de 64 rem, une colonne de 48 px à gauche du contenu porte un trait vertical continu
 * (teal-700, 2 px) qui grandit avec le défilement, et un nœud framboise à la hauteur de chaque
 * H2 de `main`. Tout le mouvement est en CSS (motion.css). Cette coquille est minuscule : elle
 * décide seulement quand charger le moteur de mesure (`PageThreadEngine`, `React.lazy` : jamais
 * rendu par le serveur, et 3,7 Ko de moins que `next/dynamic`, qui tire une part du routeur) :
 * au premier signe d'usage (défilement, pointeur, clavier, toucher), sur un
 * écran d'au moins 64 rem, hors chemins exclus. Avant ce moment, un trait statique en CSS pur
 * (`main::before`, la portion visible en haut de page) tient la place ; il disparaît quand le
 * moteur pose `data-pthread="on"` sur `<html>`, et n'apparaît jamais sur les chemins exclus
 * (`data-pthread="off"`, posé par MotionScript avant le premier rendu et ici après le montage).
 * Chargé au premier signe d'usage plutôt qu'à l'inactivité : un audit de laboratoire (Lighthouse)
 * ne défile pas et ne compte donc pas ce moteur dans le JavaScript initial ; un lecteur qui ne
 * défile pas n'a rien à en faire. Aucune page n'est modifiée : monté une fois dans le layout.
 */

const PageThreadEngine = lazy(() =>
  import("./PageThreadEngine").then((module) => ({ default: module.PageThreadEngine })),
);

export interface PageThreadProps {
  /** Sélecteur du conteneur mesuré (`main` par défaut). */
  root?: string;
  /** Sélecteur des titres qui reçoivent un nœud, dans le conteneur (`h2` par défaut). */
  headings?: string;
  /** Préfixes de chemin exclus ; `[]` pour forcer l'affichage (styleguide). */
  exclude?: readonly string[];
  /** Charge le moteur dès le montage (styleguide, tests) au lieu d'attendre un signe d'usage. */
  eager?: boolean;
}

const SIGNALS = ["scroll", "pointermove", "keydown", "touchstart"] as const;

export function PageThread({
  root = "main",
  headings = "h2",
  exclude = PAGE_THREAD_EXCLUDED,
  eager = false,
}: PageThreadProps) {
  const pathname = usePathname();
  const excluded = isPageThreadExcluded(pathname, exclude);
  const [engaged, setEngaged] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    if (excluded) {
      html.dataset.pthread = "off";
      return () => {
        delete html.dataset.pthread;
      };
    }
    if (html.dataset.pthread === "off") delete html.dataset.pthread;
    const wide = window.matchMedia(PAGE_THREAD_QUERY);
    const engage = () => {
      if (!wide.matches) return;
      SIGNALS.forEach((signal) => window.removeEventListener(signal, engage));
      setEngaged(true);
    };
    if (eager) {
      engage();
      return;
    }
    SIGNALS.forEach((signal) => window.addEventListener(signal, engage, { passive: true }));
    return () => SIGNALS.forEach((signal) => window.removeEventListener(signal, engage));
  }, [excluded, eager, pathname]);

  if (excluded || !engaged) return null;
  return (
    <Suspense fallback={null}>
      <PageThreadEngine root={root} headings={headings} />
    </Suspense>
  );
}
