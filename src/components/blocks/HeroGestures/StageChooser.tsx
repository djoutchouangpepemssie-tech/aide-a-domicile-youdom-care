"use client";

import { useId, useState, useSyncExternalStore } from "react";
import type { HeroTone } from "@/components/blocks/Hero/Hero";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";
import { gestureList, gestureQuestion, gestureRow } from "./gesture-row";
import { stageAnchorId } from "./params";

/*
 * « Où en est la maladie ? » (docs/design/CONCEPT.md §4, pilier Maladies neurodégénératives et
 * ses sept pathologies) : trois rangées de 56 px, une par stade de la section 4.
 * - Sans JavaScript (rendu serveur, hydratation) : des ancres vers `#stade-1`, `#stade-2`,
 *   `#stade-3`, les identifiants posés par `StageCards` sur chaque jalon.
 * - Avec JavaScript : des boutons à bascule (`aria-pressed`) qui font défiler jusqu'à la carte
 *   (défilement doux, immédiat en mouvement réduit) et la marquent (`data-active="true"` : la
 *   carte prend le nœud framboise, styles de `ThreadConnector`). Le focus reste sur le bouton.
 * Aucune donnée conservée : l'état vit dans le composant, le temps de la page.
 */

export interface StageChooserProps {
  texts: { question: string; choix: readonly string[] };
  tone?: HeroTone;
}

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** Marque la carte `index` (`data-active`) et retire la marque des autres. */
export function markStage(index: number, count: number): HTMLElement | null {
  let target: HTMLElement | null = null;
  for (let i = 0; i < count; i += 1) {
    const card = document.getElementById(stageAnchorId(i));
    if (!card) continue;
    if (i === index) {
      card.dataset.active = "true";
      target = card;
    } else {
      delete card.dataset.active;
    }
  }
  return target;
}

export function StageChooser({ texts, tone = "clair" }: StageChooserProps) {
  const questionId = useId();
  const enhanced = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const [active, setActive] = useState<number | null>(null);

  function choose(index: number) {
    setActive(index);
    const card = markStage(index, texts.choix.length);
    if (!card) return;
    card.classList.add("scroll-mt-28");
    card.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  }

  return (
    <div
      role="group"
      aria-labelledby={questionId}
      data-gesture="stades"
      data-enhanced={enhanced ? "true" : undefined}
      className="hero-gesture"
    >
      <p id={questionId} className={gestureQuestion(tone)}>
        {texts.question}
      </p>
      <ul className={gestureList}>
        {texts.choix.map((label, index) => (
          <li key={label} className="max-w-none">
            {enhanced ? (
              <button
                type="button"
                className={gestureRow(tone)}
                aria-pressed={active === index}
                onClick={() => choose(index)}
              >
                {label}
              </button>
            ) : (
              <a href={`#${stageAnchorId(index)}`} className={gestureRow(tone)}>
                {label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
