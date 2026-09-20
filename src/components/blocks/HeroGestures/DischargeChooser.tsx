import type { HeroTone } from "@/components/blocks/Hero/Hero";
import { GestureLinks } from "./GestureLinks";
import { dischargeValues, gestureParams, withParam, type DischargeValue } from "./params";

/*
 * « Quand est la sortie ? » (docs/design/CONCEPT.md §4, sortie d'hospitalisation) : trois
 * choix qui mènent au formulaire express avec `?sortie=` (params.ts). Aucun délai promis,
 * aucun compte à rebours : le choix ne fait que se reporter dans l'adresse du formulaire.
 */

export interface DischargeChooserProps {
  texts: { question: string; choix: Record<DischargeValue, string> };
  /** Adresse du formulaire express (`formPaths["sortie-hospitalisation"]`). */
  formHref: string;
  tone?: HeroTone;
}

export function DischargeChooser({ texts, formHref, tone }: DischargeChooserProps) {
  return (
    <GestureLinks
      name="sortie"
      question={texts.question}
      tone={tone}
      choices={dischargeValues.map((value) => ({
        href: withParam(formHref, gestureParams.sortie, value),
        label: texts.choix[value],
        icon: "retour-hopital",
      }))}
    />
  );
}
