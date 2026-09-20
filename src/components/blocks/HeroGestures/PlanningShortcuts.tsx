import type { HeroTone } from "@/components/blocks/Hero/Hero";
import type { IconName } from "@/components/ui/Icon/icons";
import { GestureLinks } from "./GestureLinks";
import {
  gestureParams,
  planningShortcutValues,
  withParam,
  type PlanningShortcutValue,
} from "./params";

/*
 * « Quand voulez-vous de l'aide ? » (docs/design/CONCEPT.md §4, pilier Adultes en situation de
 * handicap) : quatre raccourcis du planning qui mènent au formulaire du cas avec `?planning=`
 * (params.ts). Le formulaire pourra lire ce paramètre pour pré-remplir l'étape Planning ; il ne
 * le fait pas encore. Sans JavaScript : ce sont déjà des liens.
 */

export interface PlanningShortcutsProps {
  texts: { question: string; choix: Record<PlanningShortcutValue, string> };
  /** Adresse du formulaire du cas (`formPaths[page.formulaire]`). */
  formHref: string;
  tone?: HeroTone;
}

const icons: Record<PlanningShortcutValue, IconName> = {
  "matin-soir": "lever",
  semaine: "calendrier",
  "week-end": "jour",
  "24h": "24h",
};

export function PlanningShortcuts({ texts, formHref, tone }: PlanningShortcutsProps) {
  return (
    <GestureLinks
      name="planning"
      question={texts.question}
      tone={tone}
      choices={planningShortcutValues.map((value) => ({
        href: withParam(formHref, gestureParams.planning, value),
        label: texts.choix[value],
        icon: icons[value],
      }))}
    />
  );
}
