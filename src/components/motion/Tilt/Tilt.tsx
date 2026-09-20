"use client";

import {
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type PointerEvent,
} from "react";
import { cn } from "@/lib/cn";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";

/*
 * Carte qui s'incline légèrement vers le pointeur (docs/design/BRIEF_EXPERIENCE.md §3) :
 * perspective 800 px, 6° au maximum, retour en 200 ms (CSS). Souris seulement : rien au toucher,
 * au stylet, au clavier (le focus ne déclenche rien), ni en mouvement réduit. Le transform ne
 * capture aucun événement : les liens et boutons à l'intérieur restent cliquables et lisibles.
 * Aucun état React : un style en ligne posé au rythme de `requestAnimationFrame`.
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
  const frame = useRef(0);
  const point = useRef({ x: 0, y: 0 });
  const limit = clamp(max, 0, TILT_MAX_DEGREES);

  useEffect(() => {
    const pending = frame;
    return () => cancelAnimationFrame(pending.current);
  }, []);

  function handleMove(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse" || limit === 0 || prefersReducedMotion()) return;
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    point.current = {
      x: clamp((event.clientX - rect.left) / rect.width - 0.5, -0.5, 0.5),
      y: clamp((event.clientY - rect.top) / rect.height - 0.5, -0.5, 0.5),
    };
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const { x, y } = point.current;
      const rotateX = (-y * 2 * limit).toFixed(2);
      const rotateY = (x * 2 * limit).toFixed(2);
      element.dataset.tilt = "active";
      element.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
  }

  function handleLeave(event: PointerEvent<HTMLElement>) {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    const element = event.currentTarget;
    delete element.dataset.tilt;
    element.style.transform = "";
  }

  const Tag: ElementType = as;
  return (
    <Tag
      className={cn("m-tilt", className)}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      onPointerCancel={handleLeave}
      {...rest}
    >
      {children}
    </Tag>
  );
}
