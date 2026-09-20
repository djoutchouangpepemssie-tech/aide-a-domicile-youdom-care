import type { HeroTone } from "@/components/blocks/Hero/Hero";
import { GestureLinks } from "./GestureLinks";
import { gestureParams, withParam } from "./params";

/*
 * Première question de « Où en êtes-vous ? » posée dans le hero du pilier Aidants
 * (docs/design/CONCEPT.md §4). La question et ses trois réponses viennent telles quelles de
 * content/pages/ou-en-etes-vous.json ; répondre mène à la page du questionnaire avec la réponse
 * dans l'adresse (`?q1=<valeur>`, params.ts), que la page pourra reprendre plus tard. Rien n'est
 * conservé ici : ce sont des liens. La mention « Pas un test médical. Rien n'est conservé. »
 * reste visible sous les réponses.
 */

export interface CaregiverFirstQuestionProps {
  question: string;
  reponses: readonly { valeur: number; libelle: string }[];
  /** Adresse de la page du questionnaire (`/aidants/ou-en-etes-vous/`). */
  href: string;
  mention: string;
  tone?: HeroTone;
}

export function CaregiverFirstQuestion({
  question,
  reponses,
  href,
  mention,
  tone,
}: CaregiverFirstQuestionProps) {
  return (
    <GestureLinks
      name="questionnaire"
      question={question}
      tone={tone}
      note={mention}
      choices={reponses.map((reponse) => ({
        href: withParam(href, gestureParams.questionnaire, reponse.valeur),
        label: reponse.libelle,
      }))}
    />
  );
}
