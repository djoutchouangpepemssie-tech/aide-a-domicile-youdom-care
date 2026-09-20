"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { PAGE_THREAD_QUERY } from "@/lib/motion/page-thread";

/*
 * Moteur du fil conducteur, chargé à la demande par `PageThread` (voir ce fichier). Il ne fait
 * que mesurer : position et hauteur du conteneur, ce qui reste dessous (pied de page), hauteur
 * de chaque titre visible, remesurées quand le document change de taille (ResizeObserver), à
 * la redimension, au chargement des polices. Il rend hors du flux (`position: absolute`,
 * `aria-hidden`, sans pointeur) un trait et un anneau ouvert par titre ; motion.css les anime :
 * `animation-timeline: scroll()` pour le trait (pointe à 55 % de l'écran), `view()` pour chaque
 * nœud ; trait complet et nœuds noués sans prise en charge, en mouvement réduit, en mode
 * confort. Pose `data-pthread="on"` sur `<html>` pour retirer le trait statique de la coquille.
 */

export interface PageThreadEngineProps {
  root: string;
  headings: string;
}

export interface PageLayout {
  top: number;
  height: number;
  /** Ce qui reste sous le conteneur (pied de page) : le trait finit au bas de `main`, pas du document. */
  below: number;
  knots: number[];
}

/* Anneau ouvert (60° laissés libres), comme ThreadKnot : le nœud se noue, il ne se ferme pas. */
const KNOT_RING = "M6 1A5 5 0 1 1 1.67 3.5";

/** Ordonnée du nœud d'un titre : le milieu de sa première ligne. */
function knotOffset(heading: Element, rect: DOMRect): number {
  const lineHeight = Number.parseFloat(getComputedStyle(heading).lineHeight);
  const first = Number.isFinite(lineHeight) ? Math.min(lineHeight, rect.height) : rect.height;
  return first / 2;
}

export function measurePage(root: string, headings: string): PageLayout | null {
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

export function PageThreadEngine({ root, headings }: PageThreadEngineProps) {
  const [layout, setLayout] = useState<PageLayout | null>(null);

  useEffect(() => {
    const wide = window.matchMedia(PAGE_THREAD_QUERY);
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
  }, [root, headings]);

  useEffect(() => {
    if (!layout) return;
    const html = document.documentElement;
    html.dataset.pthread = "on";
    return () => {
      if (html.dataset.pthread === "on") delete html.dataset.pthread;
    };
  }, [layout]);

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
