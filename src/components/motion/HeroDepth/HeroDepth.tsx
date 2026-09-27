"use client";

import { useEffect, useRef, type ComponentPropsWithoutRef, type PointerEvent } from "react";
import { cn } from "@/lib/cn";
import { FINE_POINTER_QUERY, MOTION_TILT_MAX_DEGREES } from "@/lib/motion/grid";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";

/*
 * Profondeur du hero (docs/design/CONCEPT.md §2 « Le rôle de la 3D légère », §6 `hero-depth`,
 * plafond ramené à 2° par le contrat du mouvement, BRIEF_LIQUID_GLASS §5) : la scène (photo, fil,
 * nœud, chacun à sa profondeur `translateZ`) pivote de 2° au plus vers le pointeur, perspective
 * 1 200 px. Île minuscule : elle ne porte qu'un gestionnaire `pointerenter` ; au premier survol
 * d'une souris, avec un pointeur fin (`(hover: hover) and (pointer: fine)`) et le mouvement
 * permis, elle charge le moteur commun (`lib/motion/pointer`, partagé avec `Tilt` et `Sheen`) qui
 * pose `--rx`, `--ry` et `data-depth` sur la scène au rythme d'une image groupée. La CSS
 * (motion.css) ne fait tourner la scène que sur ordinateur avec un pointeur fin. Rien au toucher,
 * au stylet, au clavier (le focus remet la scène à plat), ni en mouvement réduit, en mode confort
 * ou sous la simulation. `will-change` n'est posé que pendant l'interaction. Aucun état React,
 * aucun gestionnaire posé sur les enfants (liens et boutons intacts). Rendu serveur : scène à plat.
 */

export interface HeroDepthProps extends ComponentPropsWithoutRef<"div"> {
  /** Rotation maximale vers le pointeur, en degrés : 2 au plus (0 = aucune inclinaison). */
  maxDeg?: number;
}

/** Plafond de la rotation (contrat du mouvement : 2° au plus, comme `Tilt`). */
export const DEPTH_MAX_DEGREES = MOTION_TILT_MAX_DEGREES;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Vrai si ce survol mérite de charger le moteur : souris, pointeur fin, mouvement permis. */
export function shouldEngage(pointerType: string): boolean {
  return (
    pointerType === "mouse" &&
    !prefersReducedMotion() &&
    (window.matchMedia?.(FINE_POINTER_QUERY).matches ?? false)
  );
}

export function HeroDepth({
  maxDeg = DEPTH_MAX_DEGREES,
  className,
  children,
  ...rest
}: HeroDepthProps) {
  const stage = useRef<HTMLDivElement>(null);
  const detach = useRef<(() => void) | null>(null);
  const loading = useRef(false);
  const limit = clamp(maxDeg, 0, DEPTH_MAX_DEGREES);

  useEffect(() => {
    return () => {
      detach.current?.();
      detach.current = null;
    };
  }, []);

  function handleEnter(event: PointerEvent<HTMLDivElement>) {
    if (limit === 0 || loading.current || detach.current || !shouldEngage(event.pointerType)) {
      return;
    }
    loading.current = true;
    const target = event.currentTarget;
    void import("@/lib/motion/pointer").then(({ attachPointerTilt }) => {
      const element = stage.current;
      if (!element || !target.isConnected) return;
      detach.current = attachPointerTilt(target, {
        limit,
        apply: (rotateX, rotateY) => {
          element.dataset.depth = "active";
          element.style.willChange = "transform";
          element.style.setProperty("--rx", `${rotateX}deg`);
          element.style.setProperty("--ry", `${rotateY}deg`);
        },
        reset: () => {
          delete element.dataset.depth;
          element.style.removeProperty("--rx");
          element.style.removeProperty("--ry");
          element.style.willChange = "";
        },
      });
    });
  }

  return (
    <div
      className={cn("m-depth", className)}
      data-max-deg={limit}
      onPointerEnter={limit > 0 ? handleEnter : undefined}
      {...rest}
    >
      <div ref={stage} className="m-depth__stage">
        {children}
      </div>
    </div>
  );
}
