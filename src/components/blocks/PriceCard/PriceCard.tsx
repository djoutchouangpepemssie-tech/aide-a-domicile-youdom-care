import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card/Card";
import type { InterventionMode, Service } from "@/content/schemas";
import { cn } from "@/lib/cn";
import { afterTaxCredit, formatEuro, formatRate, monthlyExample } from "@/lib/pricing/pricing";

/*
 * Carte de prix (docs/07 §1, docs/02 §7) : prix TTC en grand (information principale), prix HT,
 * unité et mode d'intervention obligatoires ; en dessous, plus petit, le montant après crédit
 * d'impôt ; exemple mensuel facultatif. Se masque entièrement si le tarif n'est pas renseigné.
 * En mode mandataire, le parent fournit la mention légale (`notice`, composant de P2.5).
 */

export interface PriceCardTexts {
  ttc: string;
  ht: string;
  /** Contient {unite}. */
  par_unite: string;
  avant_avantage: string;
  /** Contient {montant} et {taux}. */
  apres_credit: string;
  /** Contient {heures} et {montant}. */
  exemple_mensuel: string;
  /** Contient {mode}. */
  mode: string;
  devis: string;
  unites: Record<Service["unite"], string>;
  modes: Record<InterventionMode, string>;
}

export interface PriceCardProps {
  service: Service;
  /** Taux du crédit d'impôt (content/tarifs.json > credit_impot_taux). */
  creditImpotTaux: number;
  /** Heures hebdomadaires de l'exemple mensuel ; absent : pas d'exemple. */
  exampleHoursPerWeek?: number;
  /** Mention légale du mode mandataire (P2.5). */
  notice?: ReactNode;
  className?: string;
}

/** Un prix n'est affichable qu'avec TTC, HT, unité et mode. */
export function isDisplayablePrice(service: Service): service is Service & {
  prix_ttc: number;
  prix_ht: number;
} {
  return service.prix_ttc !== null && service.prix_ht !== null;
}

export function PriceCard({
  service,
  creditImpotTaux,
  exampleHoursPerWeek,
  notice,
  className,
  texts,
}: PriceCardProps & { texts: PriceCardTexts }) {
  if (!isDisplayablePrice(service)) return null;

  const unit = texts.par_unite.replace("{unite}", texts.unites[service.unite]);
  const afterCredit = afterTaxCredit(service.prix_ttc, creditImpotTaux);
  const example =
    exampleHoursPerWeek !== undefined && service.unite === "heure"
      ? texts.exemple_mensuel
          .replace("{heures}", String(exampleHoursPerWeek))
          .replace("{montant}", formatEuro(monthlyExample(service.prix_ttc, exampleHoursPerWeek)))
      : null;

  return (
    <Card
      as="article"
      className={cn("price-card", className)}
      aria-label={service.libelle}
      data-mode={service.mode}
    >
      <p className="m-0 font-bold">{service.libelle}</p>
      <p className="m-0 text-small text-text-soft">{service.activite}</p>
      <p className="m-0 mt-4">
        <span className="figure text-h2 tabular-figures text-teal-900">
          {formatEuro(service.prix_ttc)}
        </span>{" "}
        <span className="font-bold">{texts.ttc}</span>{" "}
        <span className="text-text-soft">{unit}</span>
      </p>
      <p className="m-0 text-small text-text-soft">
        {texts.avant_avantage} · {formatEuro(service.prix_ht)} {texts.ht}
      </p>
      <p className="m-0 mt-2 text-small">
        {texts.apres_credit
          .replace("{montant}", formatEuro(afterCredit))
          .replace("{taux}", formatRate(creditImpotTaux))}
      </p>
      {example ? <p className="m-0 mt-2 text-small text-text-soft">{example}</p> : null}
      <p className="m-0 mt-4 inline-block rounded-full bg-teal-50 px-3 py-1 text-small font-bold">
        {texts.mode.replace("{mode}", texts.modes[service.mode])}
      </p>
      {service.mode === "mandataire" && notice ? <div className="mt-3">{notice}</div> : null}
      <p className="m-0 mt-3 text-small text-text-soft">{texts.devis}</p>
    </Card>
  );
}
