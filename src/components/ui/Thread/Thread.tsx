"use client";

import { useEffect, useRef, type ComponentPropsWithoutRef, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { MOTION_DURATION, ms } from "@/lib/motion/grid";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";
import { isOnScreen, observeOnce } from "@/lib/motion/viewport";
import { threadIllustrations, type ThreadIllustrationName } from "./illustrations";

/*
 * Le fil (docs/02 §1) : tracé SVG d'épaisseur constante, extrémités arrondies, jamais fermé ni
 * rempli. teal-700 sur fond clair, blanc sur fond sombre, un seul segment framboise (le nœud).
 * Il se dessine une seule fois à l'entrée dans l'écran, en 400 ms (contrat du mouvement,
 * BRIEF_LIQUID_GLASS §5 : une révélation tient entre 250 et 400 ms). Durée posée par l'île, donc
 * seulement quand le mouvement est permis ; avec `prefers-reduced-motion`, le mode confort ou la
 * simulation du styleguide, le fil est affiché d'emblée. Sans JavaScript, il est visible : l'état
 * « pending » (invisible) n'est posé qu'après le montage, et jamais sur une illustration déjà dans
 * l'écran (sinon elle clignoterait).
 *
 * Aucun état React : l'île écrit `data-state` sur le DOM et confie l'entrée dans l'écran à la
 * fabrique d'observateurs partagée (`lib/motion/viewport`, un observateur par seuil pour la page).
 *
 * `parallax` : la couche glisse de 16 px avec le défilement à partir de 64 rem (`parallax-2`,
 * docs/design/CONCEPT.md §6), en CSS seul (`.m-parallax`, motion.css) ; immobile ailleurs.
 * Réservé aux illustrations : jamais une photo, jamais du texte.
 * Décoratif : `aria-hidden="true"`, jamais porteur d'une information absente du texte.
 */

export type ThreadState = "idle" | "pending" | "drawn";

export interface ThreadProps extends Omit<ComponentPropsWithoutRef<"svg">, "children"> {
  illustration: ThreadIllustrationName;
  /** `light` : fil teal-700 (fond clair) ; `dark` : fil blanc (fond teal-900). */
  tone?: "light" | "dark";
  /** Couche de profondeur discrète : 16 px liés au défilement, à partir de 64 rem. */
  parallax?: boolean;
}

/** Amplitude de `parallax-2` (CONCEPT §6) : 16 px, jamais plus. */
export const THREAD_PARALLAX_PX = 16;

/** Famille mesurée d'un coup pour savoir qui est sous le pli. */
const GROUP = ".thread";

export function Thread({
  illustration,
  tone = "light",
  parallax = false,
  className,
  style,
  ...rest
}: ThreadProps) {
  const ref = useRef<SVGSVGElement>(null);
  const { main, knot } = threadIllustrations[illustration];

  useEffect(() => {
    const element = ref.current;
    if (!element || prefersReducedMotion() || typeof IntersectionObserver === "undefined") return;
    if (isOnScreen(element, GROUP)) return;

    element.style.setProperty("--thread-duration", ms(MOTION_DURATION.draw));
    element.dataset.state = "pending";
    const unobserve = observeOnce(element, 0.2, () => {
      element.dataset.state = "drawn";
    });
    return () => {
      unobserve();
      element.dataset.state = "idle";
      element.style.removeProperty("--thread-duration");
    };
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
      data-state="idle"
      data-illustration={illustration}
      className={cn(
        "thread",
        tone === "dark" ? "text-white" : "text-teal-700",
        parallax && "m-parallax",
        className,
      )}
      style={
        parallax
          ? ({ ...style, "--m-parallax": `${THREAD_PARALLAX_PX}px` } as CSSProperties)
          : style
      }
      {...rest}
    >
      <path d={main} pathLength={1} />
      {knot ? <path d={knot} pathLength={1} className="thread-knot text-raspberry-500" /> : null}
    </svg>
  );
}
