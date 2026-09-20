import type { ComponentPropsWithoutRef, CSSProperties } from "react";
import { cn } from "@/lib/cn";

/*
 * Objet 3D léger pour un hero (docs/design/BRIEF_EXPERIENCE.md §3) en CSS 3D pur : aucune
 * bibliothèque, aucun JavaScript, composant serveur. Deux objets :
 * - `maison` : une maison en volumes (murs paper et sable, toit teal, porte framboise : le nœud) ;
 * - `fil` : le Fil en trois couches, trois arcs ouverts (jamais fermés, docs/02 §1) et un nœud.
 * Rotation lente (12 s) ou respiration (8 s) par `animation` CSS ; immobile en mouvement réduit,
 * en mode confort et sans prise en charge des transformations 3D (la pose fixe reste lisible).
 * Décoratif : `aria-hidden="true"`, jamais porteur d'une information absente du texte.
 */

export type HeroSceneVariant = "maison" | "fil";

export interface HeroSceneProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  variant?: HeroSceneVariant;
  /** Côté de la scène en pixels (200 par défaut). Tout l'objet est proportionnel. */
  size?: number;
}

function Maison() {
  return (
    <>
      <div className="m-scene__face m-scene__shadow" />
      <div className="m-scene__face m-scene__wall m-scene__wall--back" />
      <div className="m-scene__face m-scene__wall m-scene__wall--left" />
      <div className="m-scene__face m-scene__wall m-scene__wall--right" />
      <div className="m-scene__face m-scene__wall m-scene__wall--front">
        <span className="m-scene__window m-scene__window--left" />
        <span className="m-scene__window m-scene__window--right" />
        <span className="m-scene__door" />
      </div>
      <div className="m-scene__face m-scene__gable m-scene__gable--left" />
      <div className="m-scene__face m-scene__gable m-scene__gable--right" />
      <div className="m-scene__face m-scene__roof m-scene__roof--back" />
      <div className="m-scene__face m-scene__roof m-scene__roof--front" />
    </>
  );
}

function Fil() {
  return (
    <>
      <div className="m-scene__face m-scene__ring m-scene__ring--1">
        <span className="m-scene__knot" />
      </div>
      <div className="m-scene__face m-scene__ring m-scene__ring--2" />
      <div className="m-scene__face m-scene__ring m-scene__ring--3" />
    </>
  );
}

export function HeroScene({
  variant = "maison",
  size = 200,
  className,
  style,
  ...rest
}: HeroSceneProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("m-scene", `m-scene--${variant}`, className)}
      style={{ ...style, "--m-scene-size": `${size}px` } as CSSProperties}
      {...rest}
    >
      <div className="m-scene__tilt">
        <div className="m-scene__stage">{variant === "fil" ? <Fil /> : <Maison />}</div>
      </div>
    </div>
  );
}
