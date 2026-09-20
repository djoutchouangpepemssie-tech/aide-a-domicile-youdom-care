"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import type { IconName } from "@/components/ui/Icon/icons";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/lib/motion/reduced-motion";

/*
 * La fiche de vie (docs/design/CONCEPT.md §4, pilier Enfants en situation de handicap) : une
 * carte de 320 × 200 px, recto « La fiche de vie de votre enfant », verso six lignes avec icônes.
 * Le bouton « Voir ce qu'elle contient » la retourne (`flip-card` : rotation Y de 500 ms en CSS
 * 3D, `backface-visibility: hidden`, focus déplacé sur la face visible ; la face cachée est
 * `inert`). En mouvement réduit, en mode confort, et tant que JavaScript n'a pas pris la main
 * (rendu serveur), les deux faces sont affichées l'une sous l'autre : rien n'est jamais caché,
 * et le bouton fait alors défiler jusqu'au verso. Sous la carte : « Je décris les besoins de
 * mon enfant » vers le formulaire enfant. Aucune donnée conservée.
 * Durée du retournement : jeton `--duration-flip` (CONCEPT §6, déclaré dans src/styles/tokens.css,
 * à 0 dans les blocs d'extinction) ; le repli `500ms` écrit dans la classe couvre un hôte sans
 * les jetons (styleguide isolé, test).
 */

export type LifeSheetLine =
  "aime" | "apaise" | "difficulte" | "communique" | "routines" | "protocoles";

export interface LifeSheetTexts {
  titre: string;
  sous_titre: string;
  voir: string;
  recto: string;
  lignes: Record<LifeSheetLine, string>;
}

export interface LifeSheetCardProps {
  texts: LifeSheetTexts;
  /** Libellé du bouton sous la carte (« Je décris les besoins de mon enfant »). */
  buttonLabel: string;
  /** Adresse du formulaire enfant (`formPaths["enfant-handicap"]`). */
  formHref: string;
}

export const lifeSheetLines: readonly LifeSheetLine[] = [
  "aime",
  "apaise",
  "difficulte",
  "communique",
  "routines",
  "protocoles",
];

const lineIcons: Record<LifeSheetLine, IconName> = {
  aime: "jeux",
  apaise: "compagnie",
  difficulte: "menage",
  communique: "communication",
  routines: "calendrier",
  protocoles: "cahier-de-liaison",
};

const face =
  "flex min-h-[200px] w-full flex-col rounded-card border border-line bg-white p-5 shadow-1 outline-none";
const flipFace = "[grid-area:1/1] [backface-visibility:hidden]";

export function LifeSheetCard({ texts, buttonLabel, formHref }: LifeSheetCardProps) {
  const stacked = useReducedMotion();
  const [flipped, setFlipped] = useState(false);
  const touched = useRef(false);
  const frontRef = useRef<HTMLElement>(null);
  const backRef = useRef<HTMLElement>(null);
  const backId = useId();

  // Après un retournement, le focus suit la face visible (docs/design/CONCEPT.md §6, flip-card).
  useEffect(() => {
    if (!touched.current || stacked) return;
    (flipped ? backRef.current : frontRef.current)?.focus({ preventScroll: true });
  }, [flipped, stacked]);

  function toggle() {
    touched.current = true;
    if (stacked) {
      const back = backRef.current;
      back?.scrollIntoView({ behavior: "auto", block: "nearest" });
      back?.focus({ preventScroll: true });
      return;
    }
    setFlipped((value) => !value);
  }

  return (
    <div
      className="hero-gesture"
      data-gesture="fiche-de-vie"
      data-stacked={stacked ? "true" : undefined}
      data-flipped={flipped ? "true" : undefined}
    >
      <div className={cn("w-full max-w-[320px]", !stacked && "[perspective:1200px]")}>
        <div
          className={cn(
            stacked
              ? "grid gap-4"
              : cn(
                  "grid transition-transform [transform-style:preserve-3d] [transition-duration:var(--duration-flip,500ms)] [transition-timing-function:var(--ease-out)]",
                  flipped && "[transform:rotateY(180deg)]",
                ),
          )}
        >
          <section
            ref={frontRef}
            tabIndex={-1}
            aria-label={texts.titre}
            inert={!stacked && flipped}
            className={cn(face, !stacked && flipFace)}
            data-face="recto"
          >
            <Icon name="fiche-de-vie" size="lg" />
            <p className="heading-4 m-0 mt-3 text-teal-900">{texts.titre}</p>
            <p className="m-0 mt-1 text-small text-text-soft">{texts.sous_titre}</p>
            <button
              type="button"
              aria-pressed={flipped}
              aria-controls={backId}
              onClick={toggle}
              className="mt-auto inline-flex min-h-12 items-center gap-2 self-start pt-3 font-bold text-teal-700 underline decoration-[0.08em] underline-offset-[0.15em] hover:text-teal-800"
            >
              {texts.voir}
            </button>
          </section>
          <section
            ref={backRef}
            id={backId}
            tabIndex={-1}
            aria-label={texts.titre}
            inert={!stacked && !flipped}
            className={cn(face, !stacked && cn(flipFace, "[transform:rotateY(180deg)]"))}
            data-face="verso"
          >
            <ul className="m-0 grid list-none gap-2 p-0 text-small">
              {lifeSheetLines.map((line) => (
                <li key={line} className="flex max-w-none items-center gap-3">
                  <Icon name={lineIcons[line]} size="sm" />
                  <span>{texts.lignes[line]}</span>
                </li>
              ))}
            </ul>
            {!stacked ? (
              <button
                type="button"
                onClick={toggle}
                className="mt-auto inline-flex min-h-12 items-center self-start pt-3 text-small font-bold text-teal-700 underline decoration-[0.08em] underline-offset-[0.15em] hover:text-teal-800"
              >
                {texts.recto}
              </button>
            ) : null}
          </section>
        </div>
      </div>
      {/* Sous 64 rem seulement : au-dessus, le bouton principal du hero porte le même appel. */}
      <p className="m-0 mt-5 lg:hidden">
        <Button href={formHref} variant="secondary">
          {buttonLabel}
        </Button>
      </p>
    </div>
  );
}
