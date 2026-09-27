"use client";

import Link from "next/link";
import { useId, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { Icon } from "@/components/ui/Icon/Icon";
import type { IconName } from "@/components/ui/Icon/icons";
import { cn } from "@/lib/cn";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";
import { useParcours } from "./ParcoursProvider";

/*
 * Geste d'entrée de l'accueil (docs/design/CONCEPT.md §3, bloc 1) : la question et six choix,
 * icône 32 px et libellé court, rangées de 56 px, une colonne sur mobile (icône à gauche,
 * chevron à droite), deux colonnes à partir de 48 rem. Le concept prévoyait deux rangées de
 * trois sur ordinateur : la colonne du hero (700 px à côté de la photo) ne laisse alors qu'une
 * centaine de pixels au libellé et les choix « Pour moi : … » passent sur trois lignes ; en
 * deux colonnes, chaque libellé tient sur deux lignes au plus et le bloc est moins haut.
 * - Sans JavaScript (et au rendu serveur) : six liens vers les cinq piliers et vers la page
 *   « Être rappelé(e) ». Le choix « Je ne sais pas encore » reste toujours un lien.
 * - Avec JavaScript : les choix qui ont un panneau deviennent des boutons `aria-pressed` ; le
 *   choix fait défiler doucement jusqu'au bloc 2 (immédiatement en mouvement réduit) et déplace
 *   le focus sur le titre du panneau. Aucune donnée n'est conservée.
 */

export interface HeroPickerChoice {
  id: string;
  libelle: string;
  icone: IconName;
  href: string;
  /** Vrai si le bloc 2 a un panneau pour ce choix : bouton avec JavaScript, lien sinon. */
  panel: boolean;
}

export interface HeroPickerProps {
  question: string;
  choices: readonly HeroPickerChoice[];
  /** Identifiant du titre du panneau (bloc 2) : cible du défilement et du focus. */
  panelTitleId: string;
  className?: string;
}

const subscribeNoop = () => () => {};

/** Faux au rendu serveur et pendant l'hydratation, vrai ensuite : liens, puis boutons. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

/*
 * Rangées de 56 px au moins, de même hauteur sur une ligne de la grille (`h-full`). Dans le hero
 * (brief docs/design/BRIEF_LIQUID_GLASS.md §4), la hauteur visible commande : dès 42 rem de haut
 * les rangées descendent à 44 px (cible tactile tenue), le chevron s'efface et l'icône rapetisse,
 * pour que la question et les choix restent dans la fenêtre avec l'action et le repère.
 */
const rowClass =
  "flex h-full min-h-14 w-full items-center gap-3 rounded-button border border-line bg-white px-4 py-2 " +
  "text-left text-small leading-snug font-bold text-teal-900 no-underline shadow-1 " +
  "transition-[background-color,border-color,box-shadow] [transition-duration:var(--duration-base)] [transition-timing-function:var(--ease-out)] " +
  "hover:border-teal-700 hover:bg-teal-50 motion-reduce:transition-none " +
  "max-lg:min-h-11 max-lg:gap-2 max-lg:px-3";

const pressedClass = "aria-pressed:border-teal-700 aria-pressed:bg-teal-50";

function Chevron() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="ml-auto shrink-0 text-teal-700 max-lg:hidden"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function HeroPicker({ question, choices, panelTitleId, className }: HeroPickerProps) {
  const questionId = useId();
  const hydrated = useHydrated();
  const { selected, select } = useParcours();

  function choose(id: string) {
    // Le titre du panneau change de texte dans le même rendu : on force le rendu avant de
    // déplacer le focus pour que le lecteur d'écran lise le nouveau titre.
    flushSync(() => select(id));
    const title = document.getElementById(panelTitleId);
    if (!title) return;
    if (typeof title.scrollIntoView === "function") {
      title.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
    }
    title.focus({ preventScroll: true });
  }

  return (
    <div
      role="group"
      aria-labelledby={questionId}
      className={cn("hero-picker", className)}
      data-hydrated={hydrated ? "true" : undefined}
    >
      <p id={questionId} className="m-0 font-bold text-teal-900 max-lg:text-small">
        {question}
      </p>
      <ul
        className={cn(
          "m-0 mt-3 grid list-none grid-cols-1 gap-3 p-0 min-[22rem]:grid-cols-2",
          "max-lg:mt-2 max-lg:gap-2",
        )}
      >
        {choices.map((choice) => {
          const content = (
            <>
              <Icon name={choice.icone} size="lg" className="shrink-0 max-lg:size-6" />
              <span>{choice.libelle}</span>
              <Chevron />
            </>
          );
          return (
            <li key={choice.id} className="max-w-none">
              {hydrated && choice.panel ? (
                <button
                  type="button"
                  aria-pressed={selected === choice.id}
                  onClick={() => choose(choice.id)}
                  className={cn(rowClass, pressedClass)}
                  data-choice={choice.id}
                >
                  {content}
                </button>
              ) : (
                <Link href={choice.href} className={rowClass} data-choice={choice.id}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
