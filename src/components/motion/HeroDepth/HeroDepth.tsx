"use client";

import { useEffect, useRef, type ComponentPropsWithoutRef, type PointerEvent } from "react";
import { cn } from "@/lib/cn";
import { FINE_POINTER_QUERY } from "@/lib/motion/pointer-tilt";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";

/*
 * Profondeur du hero (docs/design/CONCEPT.md §2 « Le rôle de la 3D légère », §6 `hero-depth`) :
 * la scène (photo, fil, nœud, chacun à sa profondeur `translateZ`) pivote de 4° au plus vers le
 * pointeur, perspective 1 200 px, retour en 300 ms (`--duration-slow`). Île minuscule : elle ne
 * porte qu'un gestionnaire `pointerenter` ; au premier survol d'une souris, avec un pointeur fin
 * (`(hover: hover) and (pointer: fine)`) et le mouvement permis, elle charge le moteur commun
 * (`lib/motion/pointer-tilt`, partagé avec `Tilt`) qui pose `--rx`, `--ry` et `data-depth` sur
 * la scène au rythme de `requestAnimationFrame`. La CSS (motion.css) ne fait tourner la scène
 * que sur ordinateur avec un pointeur fin. Rien au toucher, au stylet, au clavier, ni en
 * mouvement réduit, en mode confort ou sous la simulation. Aucun état React, aucun gestionnaire
 * posé sur les enfants (liens et boutons intacts). Rendu serveur : la scène à plat.
 */

export interface HeroDepthProps extends ComponentPropsWithoutRef<"div"> {
  /** Rotation maximale vers le pointeur, en degrés : 4 par défaut, 2 pour les aidants, 0 = désactivé. */
  maxDeg?: number;
}

/** Plafond de la rotation (CONCEPT §6 : « ±4° »). */
export const DEPTH_MAX_DEGREES = 4;

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
    void import("@/lib/motion/pointer-tilt").then(({ attachPointerTilt }) => {
      const element = stage.current;
      if (!element || !target.isConnected) return;
      detach.current = attachPointerTilt(target, {
        limit,
        apply: (rotateX, rotateY) => {
          element.dataset.depth = "active";
          element.style.setProperty("--rx", `${rotateX}deg`);
          element.style.setProperty("--ry", `${rotateY}deg`);
        },
        reset: () => {
          delete element.dataset.depth;
          element.style.removeProperty("--rx");
          element.style.removeProperty("--ry");
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
