import type { ReactNode } from "react";
import { HeroDepth } from "@/components/motion/HeroDepth/HeroDepth";
import { cn } from "@/lib/cn";
import { heroThreads, parseKnot, type HeroThreadFil } from "./hero-threads";
import { HeroThreadArm } from "./HeroThreadArm";
import "./hero-thread.css";

/*
 * Le fil qui signe le hero (docs/design/CONCEPT.md §2 « Il signe le hero », §6 `fil-hero`) :
 * il part du dernier mot du H1 (souligné d'un trait ouvert), file vers la photo, l'entoure à
 * demi et pose son nœud framboise sur le point d'intérêt (`knot`, « x% y% »). Un seul tracé,
 * 1 200 ms (`--thread-hero-duration`), une fois, après le chargement de la photo.
 *
 * Composant serveur : le SVG, les géométries (`hero-threads.ts`) et le nœud sont rendus par le
 * serveur et ne partent jamais au client. Seule l'île `HeroThreadArm` est cliente : elle mesure
 * le dernier mot du titre (trait `reach`, entrée du contour recalée) et arme le tracé au
 * chargement de la photo. Trois couches, chacune à sa profondeur pour HeroDepth : la photo
 * (`children`), le fil (`translateZ(24px)`), le nœud (`translateZ(48px)`). Le trait qui part du
 * H1 reste hors de la scène : le texte ne bouge jamais, son soulignement non plus.
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

const svgProps = {
  "aria-hidden": true,
  focusable: "false",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function HeroThread({
  fil = "generique",
  knot,
  tone = "light",
  depth,
  heading = "h1",
  className,
  children,
}: HeroThreadProps) {
  const geometry = heroThreads[fil];
  const [kx, ky] = parseKnot(knot);

  return (
    <div
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
      <HeroThreadArm heading={heading} />
    </div>
  );
}
