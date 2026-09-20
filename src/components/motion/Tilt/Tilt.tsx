"use client";

import {
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type PointerEvent,
} from "react";
import { cn } from "@/lib/cn";
import { FINE_POINTER_QUERY } from "@/lib/motion/pointer-tilt";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";

/*
 * Carte qui s'incline légèrement vers le pointeur (docs/design/BRIEF_EXPERIENCE.md §3) :
 * perspective 800 px, 6° au maximum, retour en 200 ms (CSS). Île minuscule : un gestionnaire
 * `pointerenter` ; au premier survol d'une souris avec un pointeur fin et le mouvement permis,
 * elle charge le moteur commun (`lib/motion/pointer-tilt`, partagé avec `HeroDepth`) qui pose le
 * style en ligne au rythme de `requestAnimationFrame`. Rien au toucher, au stylet, au clavier
 * (le focus ne déclenche rien), ni en mouvement réduit. Le transform ne capture aucun
 * événement : les liens et boutons à l'intérieur restent cliquables et lisibles. Aucun état
 * React. Rendu serveur inchangé : `class="m-tilt"`, aucun style.
 */

export interface TiltProps extends ComponentPropsWithoutRef<"div"> {
  as?: "div" | "article" | "li" | "section";
  /** Inclinaison maximale en degrés, plafonnée à 6. */
  max?: number;
}

export const TILT_MAX_DEGREES = 6;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function Tilt({
  as = "div",
  max = TILT_MAX_DEGREES,
  className,
  children,
  ...rest
}: TiltProps) {
  const detach = useRef<(() => void) | null>(null);
  const loading = useRef(false);
  const limit = clamp(max, 0, TILT_MAX_DEGREES);

  useEffect(() => {
    return () => {
      detach.current?.();
      detach.current = null;
    };
  }, []);

  function handleEnter(event: PointerEvent<HTMLElement>) {
    if (
      limit === 0 ||
      loading.current ||
      detach.current ||
      event.pointerType !== "mouse" ||
      prefersReducedMotion() ||
      !(window.matchMedia?.(FINE_POINTER_QUERY).matches ?? false)
    ) {
      return;
    }
    loading.current = true;
    const element = event.currentTarget;
    void import("@/lib/motion/pointer-tilt").then(({ attachPointerTilt }) => {
      if (!element.isConnected) return;
      detach.current = attachPointerTilt(element, {
        limit,
        apply: (rotateX, rotateY) => {
          element.dataset.tilt = "active";
          element.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        },
        reset: () => {
          delete element.dataset.tilt;
          element.style.transform = "";
        },
      });
    });
  }

  // Assertion plutôt qu'annotation : une annotation serait rétrécie au type union de `as`.
  const Tag = as as ElementType;
  return (
    <Tag
      className={cn("m-tilt", className)}
      onPointerEnter={limit > 0 ? handleEnter : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}
