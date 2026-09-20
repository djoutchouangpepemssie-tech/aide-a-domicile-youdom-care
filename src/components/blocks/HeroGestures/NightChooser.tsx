import Link from "next/link";
import { useId } from "react";
import type { HeroTone } from "@/components/blocks/Hero/Hero";
import { Icon } from "@/components/ui/Icon/Icon";
import { cn } from "@/lib/cn";
import { GestureLinks } from "./GestureLinks";
import { gestureQuestion, gestureRow } from "./gesture-row";
import {
  durationValues,
  gestureParams,
  nightValues,
  withParam,
  type DurationValue,
  type NightValue,
} from "./params";

/*
 * Geste des pages de nuit (docs/design/CONCEPT.md §4).
 * - `nuit` (garde de nuit) : « Nuit calme ou nuit active ? », deux cartes qui affichent chacune
 *   une phrase et une rangée de 56 px vers le formulaire nuit avec `?nuit=calme|active`.
 * - `duree` (présence 24h/24) : « Combien de temps ? », trois rangées avec `?duree=`.
 * Les valeurs sont celles de `nightKinds` et `durations` (src/lib/lead/forms.ts). Composant
 * serveur : les deux phrases sont toujours visibles, rien n'est conservé, ce sont des liens.
 */

export interface NightChooserTexts {
  question: string;
  calme: { titre: string; texte: string };
  active: { titre: string; texte: string };
  duree_question: string;
  durees: Record<DurationValue, string>;
}

export interface NightChooserProps {
  texts: NightChooserTexts;
  /** Adresse du formulaire nuit et 24h/24 (`formPaths["nuit-24h"]`). */
  formHref: string;
  variant?: "nuit" | "duree";
  tone?: HeroTone;
}

const nightIcons: Record<NightValue, "nuit" | "jour"> = { calme: "nuit", active: "jour" };

export function NightChooser({
  texts,
  formHref,
  variant = "nuit",
  tone = "clair",
}: NightChooserProps) {
  const questionId = useId();

  if (variant === "duree") {
    return (
      <GestureLinks
        name="duree"
        question={texts.duree_question}
        tone={tone}
        choices={durationValues.map((value) => ({
          href: withParam(formHref, gestureParams.duree, value),
          label: texts.durees[value],
          icon: "calendrier",
        }))}
      />
    );
  }

  const dark = tone === "sombre";
  return (
    <div role="group" aria-labelledby={questionId} data-gesture="nuit" className="hero-gesture">
      <p id={questionId} className={gestureQuestion(tone)}>
        {texts.question}
      </p>
      <ul className="m-0 mt-3 grid list-none gap-4 p-0 sm:grid-cols-2">
        {nightValues.map((value) => (
          <li key={value} className="max-w-none">
            <article
              className={cn(
                "flex h-full flex-col gap-3 rounded-card border p-4",
                dark ? "border-white/40 bg-white/5 text-white" : "border-line bg-white shadow-1",
              )}
              data-night={value}
            >
              <Link
                href={withParam(formHref, gestureParams.nuit, value)}
                prefetch={false}
                className={gestureRow(tone, "w-full sm:w-full")}
              >
                <Icon name={nightIcons[value]} size="sm" tone={dark ? "white" : "teal"} />
                <span>{texts[value].titre}</span>
              </Link>
              <p className={cn("m-0 text-small", dark ? "text-teal-50" : "text-text-soft")}>
                {texts[value].texte}
              </p>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
