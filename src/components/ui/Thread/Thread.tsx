"use client";

import { useEffect, useRef, useState, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";
import { threadIllustrations, type ThreadIllustrationName } from "./illustrations";

/*
 * Le fil (docs/02 §1) : tracé SVG d'épaisseur constante, extrémités arrondies, jamais fermé ni
 * rempli. teal-700 sur fond clair, blanc sur fond sombre, un seul segment framboise (le nœud).
 * Il se dessine une seule fois à l'entrée dans l'écran (600 à 900 ms) ; avec
 * `prefers-reduced-motion` ou le mode confort, il est affiché d'emblée. Sans JavaScript, il est
 * visible : l'état « pending » (invisible) n'est posé qu'après le montage.
 * Décoratif : `aria-hidden="true"`, jamais porteur d'une information absente du texte.
 */

export type ThreadState = "idle" | "pending" | "drawn";

export interface ThreadProps extends Omit<ComponentPropsWithoutRef<"svg">, "children"> {
  illustration: ThreadIllustrationName;
  /** `light` : fil teal-700 (fond clair) ; `dark` : fil blanc (fond teal-900). */
  tone?: "light" | "dark";
}

function prefersNoMotion(): boolean {
  if (typeof window === "undefined") return true;
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const comfort = document.documentElement.dataset.comfort === "on";
  return reduced || comfort;
}

export function Thread({ illustration, tone = "light", className, ...rest }: ThreadProps) {
  const ref = useRef<SVGSVGElement>(null);
  const [state, setState] = useState<ThreadState>("idle");
  const { main, knot } = threadIllustrations[illustration];

  useEffect(() => {
    const element = ref.current;
    if (!element || prefersNoMotion() || typeof IntersectionObserver === "undefined") return;

    setState("pending");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState("drawn");
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <svg
      ref={ref}
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      data-state={state}
      data-illustration={illustration}
      className={cn("thread", tone === "dark" ? "text-white" : "text-teal-700", className)}
      {...rest}
    >
      <path d={main} pathLength={1} />
      {knot ? <path d={knot} pathLength={1} className="thread-knot text-raspberry-500" /> : null}
    </svg>
  );
}
