"use client";

import { useEffect, useRef, type ComponentPropsWithoutRef, type PointerEvent } from "react";
import { cn } from "@/lib/cn";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";

/*
 * Profondeur du hero (docs/design/CONCEPT.md §2 « Le rôle de la 3D légère », §6 `hero-depth`) :
 * la scène (photo, fil, nœud, chacun à sa profondeur `translateZ`) pivote de 4° au plus vers le
 * pointeur, perspective 1 200 px, retour en 300 ms (`--duration-slow`). L'île ne fait que poser
 * deux variables CSS (`--rx`, `--ry`) au rythme de `requestAnimationFrame` : la CSS (motion.css)
 * ne fait tourner la scène que sur ordinateur, avec un pointeur fin. Souris seulement : rien au
 * toucher, au stylet, au clavier, ni en mouvement réduit, en mode confort ou sous la simulation.
 * Aucun état React, aucun gestionnaire posé sur les enfants (liens et boutons intacts).
 */

export interface HeroDepthProps extends ComponentPropsWithoutRef<"div"> {
  /** Rotation maximale vers le pointeur, en degrés : 4 par défaut, 2 pour les aidants, 0 = désactivé. */
  maxDeg?: number;
}

/** Plafond de la rotation (CONCEPT §6 : « ±4° »). */
export const DEPTH_MAX_DEGREES = 4;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function HeroDepth({
  maxDeg = DEPTH_MAX_DEGREES,
  className,
  children,
  ...rest
}: HeroDepthProps) {
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const point = useRef({ x: 0, y: 0 });
  const limit = clamp(maxDeg, 0, DEPTH_MAX_DEGREES);

  useEffect(() => {
    const pending = frame;
    return () => cancelAnimationFrame(pending.current);
  }, []);

  function handleMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || limit === 0 || prefersReducedMotion()) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    point.current = {
      x: clamp((event.clientX - rect.left) / rect.width - 0.5, -0.5, 0.5),
      y: clamp((event.clientY - rect.top) / rect.height - 0.5, -0.5, 0.5),
    };
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const element = stage.current;
      if (!element) return;
      const { x, y } = point.current;
      element.dataset.depth = "active";
      element.style.setProperty("--rx", `${(-y * 2 * limit).toFixed(2)}deg`);
      element.style.setProperty("--ry", `${(x * 2 * limit).toFixed(2)}deg`);
    });
  }

  function handleLeave() {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    const element = stage.current;
    if (!element) return;
    delete element.dataset.depth;
    element.style.removeProperty("--rx");
    element.style.removeProperty("--ry");
  }

  return (
    <div
      className={cn("m-depth", className)}
      data-max-deg={limit}
      onPointerMove={limit > 0 ? handleMove : undefined}
      onPointerLeave={limit > 0 ? handleLeave : undefined}
      onPointerCancel={limit > 0 ? handleLeave : undefined}
      {...rest}
    >
      <div ref={stage} className="m-depth__stage">
        {children}
      </div>
    </div>
  );
}
