"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { HeroDepth } from "@/components/motion/HeroDepth/HeroDepth";
import { cn } from "@/lib/cn";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";
import { ENTRY_X, ENTRY_Y, heroThreads, parseKnot, type HeroThreadFil } from "./hero-threads";
import "./hero-thread.css";

/*
 * Le fil qui signe le hero (docs/design/CONCEPT.md §2 « Il signe le hero », §6 `fil-hero`) :
 * il part du dernier mot du H1 (souligné d'un trait ouvert), file vers la photo, l'entoure à
 * demi et pose son nœud framboise sur le point d'intérêt (`knot`, « x% y% »). Un seul tracé,
 * 1 200 ms (`--thread-hero-duration`), une fois, après le chargement de la photo.
 *
 * Trois couches, chacune à sa profondeur pour HeroDepth : la photo (`children`), le fil
 * (`translateZ(24px)`), le nœud (`translateZ(48px)`). Le trait qui part du H1 (`reach`) reste hors
 * de la scène : le texte ne bouge jamais, son soulignement non plus. Sa géométrie dépend de la
 * position réelle du mot : l'île la mesure après le montage (et à la redimension) et pose `d`
 * sur le DOM ; le serveur rend le contour et le nœud complets (`data-state="idle"`).
 *
 * Sans JavaScript : tout est visible. Avec JavaScript (`<html data-js>`, MotionScript), la CSS
 * cache le fil tant que `data-state` vaut `idle`, hors mouvement réduit, mode confort et
 * simulation ; l'île passe à `drawn` au chargement de la photo, et la CSS trace. En mouvement
 * réduit, l'île ne fait rien : affiché d'emblée. Décoratif (`aria-hidden`), jamais porteur
 * d'une information.
 */

export interface HeroThreadProps {
  /** Géométrie du fil (registre `hero-threads.ts`) ; `generique` par défaut. */
  fil?: HeroThreadFil;
  /** Position du nœud, « x% y% » (le `focal` de la photo, en général) ; centre par défaut. */
  knot?: string;
  /** `light` : fil teal-700 (fond clair) ; `dark` : fil blanc (fond teal-900). */
  tone?: "light" | "dark";
  /** Rotation maximale de HeroDepth en degrés (4 par défaut, 2 pour les aidants, 0 = à plat). */
  depth?: number;
  /** Sélecteur du titre dont le dernier mot est souligné, cherché dans `.hero` (`h1` par défaut). */
  heading?: string;
  className?: string;
  /** La photo du hero (PhotoFigure, ReaderPhoto…). */
  children: ReactNode;
}

/* Anneau ouvert (60° laissés libres) autour du point d'intérêt, comme ThreadKnot. */
const KNOT_RING = "M12 1A11 11 0 1 1 2.47 6.5";

const round = (value: number) => Math.round(value * 10) / 10;

/** Étendue du dernier mot du H1 (dans les deux `span` du titre s'il y en a). */
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

export interface Reach {
  /** Trait du H1 à l'entrée du contour (attribut `d`, unités relatives de la photo). */
  d: string;
  /** Hauteur de l'entrée du contour, recalée sur le mot (ordinateur) ou 16 (mobile). */
  entryY: number;
}

/**
 * Trait du H1 à la photo, en unités relatives de la boîte de la photo : soulignement ouvert du
 * dernier mot, puis une courbe jusqu'à l'entrée du contour. Sur ordinateur (mot à gauche de la
 * photo), l'entrée descend à la hauteur du mot et le trait y arrive en tournant vers le bas ;
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

export function HeroThread({
  fil = "generique",
  knot,
  tone = "light",
  depth,
  heading = "h1",
  className,
  children,
}: HeroThreadProps) {
  const ref = useRef<HTMLDivElement>(null);
  const geometry = heroThreads[fil];
  const [kx, ky] = parseKnot(knot);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const reach = root.querySelector<SVGPathElement>(".hero-thread__reach path");
    const contour = root.querySelector<SVGPathElement>(".hero-thread__fil path");
    let frame = 0;
    const measure = () => {
      frame = 0;
      const measured = measureReach(root, heading);
      if (measured) reach?.setAttribute("d", measured.d);
      else reach?.removeAttribute("d");
      contour?.setAttribute("d", geometry.main(kx, ky, measured?.entryY));
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
    const armed = !prefersReducedMotion();
    if (armed) {
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
  }, [geometry, heading, kx, ky]);

  const svgProps = {
    "aria-hidden": true,
    focusable: "false",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;

  return (
    <div
      ref={ref}
      className={cn("hero-thread", tone === "dark" ? "text-white" : "text-teal-700", className)}
      data-state="idle"
      data-fil={fil}
    >
      <HeroDepth maxDeg={depth}>
        <div className="hero-thread__photo">{children}</div>
        <svg
          {...svgProps}
          className="hero-thread__fil"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <path d={geometry.main(kx, ky)} pathLength={1} />
        </svg>
        <svg
          {...svgProps}
          className="hero-thread__knot text-raspberry-500"
          viewBox="0 0 24 24"
          style={{ left: `${kx}%`, top: `${ky}%` }}
        >
          <path d={KNOT_RING} pathLength={1} />
        </svg>
      </HeroDepth>
      <svg
        {...svgProps}
        className="hero-thread__reach"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path pathLength={1} />
      </svg>
    </div>
  );
}
