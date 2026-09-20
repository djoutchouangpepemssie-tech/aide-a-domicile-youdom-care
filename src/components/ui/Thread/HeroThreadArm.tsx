"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";
import { ENTRY_X, ENTRY_Y, withEntry } from "./hero-thread-entry";

/*
 * Armement du fil de hero (voir HeroThread.tsx) : la seule part cliente. Le serveur rend le
 * contour, le nœud et le trait vide ; cette île, montée dans `.hero-thread`, mesure le dernier
 * mot du titre pour tracer le trait qui le relie à la photo, recale l'entrée du contour à sa
 * hauteur, puis passe `data-state` à `drawn` quand la photo est chargée (hors mouvement réduit).
 * Elle ne rend qu'un `<span hidden>` qui lui sert de point d'ancrage dans le DOM.
 */

export interface HeroThreadArmProps {
  /** Sélecteur du titre dont le dernier mot est souligné, cherché dans `.hero`. */
  heading: string;
}

export interface Reach {
  /** Trait du H1 à l'entrée du contour (attribut `d`, unités relatives de la photo). */
  d: string;
  /** Hauteur de l'entrée du contour, recalée sur le mot (ordinateur) ou 16 (mobile). */
  entryY: number;
}

const round = (value: number) => Math.round(value * 10) / 10;

/** Étendue du dernier mot du titre (dans les deux `span` du H1 s'il y en a). */
function lastWordRange(heading: HTMLElement): Range | null {
  const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
  let node: Text | null = null;
  let current = walker.nextNode();
  while (current) {
    if (current.textContent?.trim()) node = current as Text;
    current = walker.nextNode();
  }
  if (!node) return null;
  const match = /(\S+)\s*$/.exec(node.data);
  const word = match?.[1];
  if (!match || !word) return null;
  const range = document.createRange();
  range.setStart(node, match.index);
  range.setEnd(node, match.index + word.length);
  return range;
}

/**
 * Trait du titre à la photo, en unités relatives de la boîte de la photo : soulignement ouvert
 * du dernier mot, puis une courbe jusqu'à l'entrée du contour. Sur ordinateur (mot à gauche de
 * la photo), l'entrée descend à la hauteur du mot et le trait y arrive en tournant vers le bas ;
 * sur mobile (mot au-dessus de la bande), il descend en S vers l'entrée par défaut.
 * Nul si rien n'est mesurable.
 */
export function measureReach(root: HTMLElement, selector = "h1"): Reach | null {
  const box = root.getBoundingClientRect();
  if (box.width === 0 || box.height === 0) return null;
  const heading = root.closest(".hero")?.querySelector<HTMLElement>(selector);
  if (!heading) return null;
  const range = lastWordRange(heading);
  // jsdom n'a pas `Range.getBoundingClientRect` : sans mesure, pas de trait.
  if (!range || typeof range.getBoundingClientRect !== "function") return null;
  const word = range.getBoundingClientRect();
  if (word.width === 0) return null;
  const nx = (px: number) => round(((px - box.left) / box.width) * 100);
  const ny = (px: number) => round(((px - box.top) / box.height) * 100);
  const y = ny(word.bottom + 4);
  const x1 = nx(word.left);
  const x2 = nx(word.right);
  const underline = `M${x1} ${y}H${x2}`;
  if (word.bottom < box.top) {
    const mid = round((y + ENTRY_Y) / 2);
    return {
      d: `${underline}C${x2} ${mid} ${ENTRY_X} ${mid} ${ENTRY_X} ${ENTRY_Y}`,
      entryY: ENTRY_Y,
    };
  }
  const entryY = Math.min(Math.max(round(y + 4), 8), 70);
  const mid = round((x2 + ENTRY_X) / 2);
  return {
    d: `${underline}C${mid} ${y} ${ENTRY_X} ${y} ${ENTRY_X} ${entryY}`,
    entryY,
  };
}

export function HeroThreadArm({ heading }: HeroThreadArmProps) {
  const anchor = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = anchor.current?.closest<HTMLElement>(".hero-thread");
    if (!root) return;
    const reach = root.querySelector<SVGPathElement>(".hero-thread__reach path");
    const contour = root.querySelector<SVGPathElement>(".hero-thread__fil path");
    const served = contour?.getAttribute("d") ?? "";
    let frame = 0;
    const measure = () => {
      frame = 0;
      const measured = measureReach(root, heading);
      if (measured) reach?.setAttribute("d", measured.d);
      else reach?.removeAttribute("d");
      contour?.setAttribute("d", withEntry(served, measured?.entryY ?? ENTRY_Y));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    document.fonts?.ready.then(schedule, () => {});
    window.addEventListener("resize", schedule);

    const image = root.querySelector("img");
    let draw = 0;
    const start = () => {
      // Deux images : la première laisse la CSS peindre l'état caché, la seconde lance le tracé.
      draw = requestAnimationFrame(() => {
        draw = requestAnimationFrame(() => {
          root.dataset.state = "drawn";
        });
      });
    };
    if (!prefersReducedMotion()) {
      if (!image || (image.complete && image.naturalWidth > 0)) start();
      else {
        image.addEventListener("load", start, { once: true });
        image.addEventListener("error", start, { once: true });
      }
    }
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(draw);
      window.removeEventListener("resize", schedule);
      image?.removeEventListener("load", start);
      image?.removeEventListener("error", start);
    };
  }, [heading]);

  return <span ref={anchor} hidden data-hero-thread-arm="" />;
}
