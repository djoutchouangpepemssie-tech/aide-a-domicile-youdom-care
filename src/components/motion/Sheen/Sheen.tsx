"use client";

import {
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type PointerEvent,
} from "react";
import { cn } from "@/lib/cn";
import { FINE_POINTER_QUERY } from "@/lib/motion/grid";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";

/*
 * Le reflet du verre qui suit le pointeur (BRIEF_LIQUID_GLASS §3 `glass-sheen`, §5 « au pointeur :
 * reflets […] 150 ms »). Partage des rôles : **le style est celui du design system** (`glass-sheen`,
 * src/styles), **le mouvement est ici**. Cette île ne dessine rien ; elle écrit seulement, sur son
 * propre élément, la position du pointeur :
 *
 * - `--sheen-x`, `--sheen-y` : position dans la boîte, en pourcentage (0 à 100), une décimale ;
 * - `data-sheen="active"` tant que la souris est dessus, retiré à la sortie.
 *
 * `glass-sheen` place son reflet avec ces deux variables (`transform`/`opacity` seulement) et
 * l'éteint sans `data-sheen`. Comme les variables sont héritées, la classe peut être posée sur cet
 * élément (`<Sheen className="glass glass-sheen">`) ou sur n'importe lequel de ses descendants.
 *
 * Coût : un seul gestionnaire `pointerenter` ; au premier survol d'une souris avec un pointeur fin
 * et le mouvement permis, l'île charge le moteur commun (`lib/motion/pointer`, déjà partagé avec
 * `Tilt` et `HeroDepth`), qui écrit au rythme d'une image groupée avec tous les autres effets.
 * Rien au toucher, au stylet, au clavier (le focus éteint le reflet), ni en mouvement réduit, en
 * mode confort ou sous la simulation. Aucun état React ; rendu serveur : la classe, aucun style.
 */

export interface SheenProps extends ComponentPropsWithoutRef<"div"> {
  as?: "div" | "article" | "section" | "li" | "span";
}

export function Sheen({ as = "div", className, children, ...rest }: SheenProps) {
  const detach = useRef<(() => void) | null>(null);
  const loading = useRef(false);

  useEffect(() => {
    return () => {
      detach.current?.();
      detach.current = null;
    };
  }, []);

  function handleEnter(event: PointerEvent<HTMLElement>) {
    if (
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
    void import("@/lib/motion/pointer").then(({ attachPointerSheen }) => {
      if (!element.isConnected) return;
      detach.current = attachPointerSheen(element, {
        apply: (x, y) => {
          element.dataset.sheen = "active";
          element.style.setProperty("--sheen-x", `${x}%`);
          element.style.setProperty("--sheen-y", `${y}%`);
        },
        reset: () => {
          delete element.dataset.sheen;
          element.style.removeProperty("--sheen-x");
          element.style.removeProperty("--sheen-y");
        },
      });
    });
  }

  // Assertion plutôt qu'annotation : une annotation serait rétrécie au type union de `as`.
  const Tag = as as ElementType;
  return (
    <Tag className={cn("m-sheen", className)} onPointerEnter={handleEnter} {...rest}>
      {children}
    </Tag>
  );
}
