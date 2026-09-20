import { Callout } from "@/components/ui/Callout/Callout";

/*
 * Mention légale du mode mandataire (docs/07 §1) : affichée partout où un prix ou une offre en
 * mode mandataire apparaît (PriceCard, page des tarifs, page des modes). Le texte vit dans
 * content/interface.json > mandataire_notice ; sa formulation définitive relève de Q-LEGAL-3.
 * check-legal (P8.3) vérifie sa présence près de chaque prix mandataire.
 */

export interface MandataireNoticeTexts {
  titre: string;
  texte: string;
}

export function MandataireNotice({
  texts,
  className,
}: {
  texts: MandataireNoticeTexts;
  className?: string;
}) {
  return (
    <Callout variant="attention" title={texts.titre} className={className} data-notice="mandataire">
      <p>{texts.texte}</p>
    </Callout>
  );
}
