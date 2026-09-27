import type { HeroTone } from "@/components/blocks/Hero/Hero";
import type { IconName } from "@/components/ui/Icon/icons";
import { GestureLinks } from "./GestureLinks";

/*
 * Geste de repli des pages services et pathologies qui n'en déclarent pas (`hero.geste` absent) :
 * « Vous vous reconnaissez ? » suivi de trois situations de la page, mot pour mot, chacune vers sa
 * destination propre (formulaire ou page précise) ou, à défaut, vers la section 2 qui les détaille.
 *
 * Aucun texte n'est écrit ici : la question est le titre de la section 2 (`service.situations_h2`)
 * et les libellés sont les titres des situations de l'en-tête MDX validé. Composant serveur, ce
 * sont des liens : rien à hydrater, rien de conservé (brief docs/design/BRIEF_LIQUID_GLASS.md §4,
 * « une interaction immédiate » sur chaque gabarit).
 */

export interface SituationChooserProps {
  /** Titre de la section 2, repris comme question (`texts.service.situations_h2`). */
  question: string;
  situations: readonly { titre: string; href?: string; icone?: IconName }[];
  /** Ancre de la section 2 quand une situation n'a pas de destination propre. */
  fallbackHref: string;
  tone?: HeroTone;
}

/** Trois choix au plus : le panneau du hero reste dans la hauteur visible. */
const MAX_CHOICES = 3;

export function SituationChooser({
  question,
  situations,
  fallbackHref,
  tone,
}: SituationChooserProps) {
  const choices = situations.slice(0, MAX_CHOICES).map((situation) => ({
    href: situation.href ?? fallbackHref,
    label: situation.titre,
    icon: situation.icone,
  }));
  if (choices.length === 0) return null;
  return <GestureLinks name="situations" question={question} tone={tone} choices={choices} />;
}
