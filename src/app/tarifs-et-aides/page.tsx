import type { Metadata } from "next";
import { AidCard } from "@/components/blocks/AidCard/AidCard";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { MandataireNotice } from "@/components/blocks/MandataireNotice/MandataireNotice";
import { isDisplayablePrice } from "@/components/blocks/PriceCard/PriceCard";
import { Section } from "@/components/layout/Section/Section";
import { Button } from "@/components/ui/Button/Button";
import { Callout } from "@/components/ui/Callout/Callout";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { Thread } from "@/components/ui/Thread/Thread";
import {
  getAids,
  getInterfaceTexts,
  getNavigation,
  getPricing,
  getPricingPage,
  getSiteConfig,
} from "@/content/loader";
import {
  afterTaxCredit,
  formatEuro,
  formatRate,
  monthlyEstimates,
  WEEKS_PER_MONTH,
} from "@/lib/pricing/pricing";
import { pageTitle } from "@/lib/seo/title";

/*
 * « Tarifs et aides » (docs/03 §9, docs/07 §1) : prix par prestation et par mode depuis
 * content/tarifs.json (TTC en avant, HT, unité, mode, montant après crédit d'impôt à part),
 * exemples mensuels calculés, frais annexes, mention mandataire près de tout prix mandataire,
 * devis gratuit, une carte par aide. Sans tarif renseigné, seuls le devis et les aides s'affichent.
 */

export function generateMetadata(): Metadata {
  const { seo } = getPricingPage();
  const { marque } = getSiteConfig();
  return {
    title: pageTitle(seo.titre, marque.nom),
    description: seo.description,
    alternates: { canonical: "/tarifs-et-aides/" },
  };
}

const frenchDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

export default function PricingPage() {
  const page = getPricingPage();
  const pricing = getPricing();
  const { aides } = getAids();
  const navigation = getNavigation();
  const { boutons, fil_ariane, mandataire_notice, tarifs, aides: aidTexts } = getInterfaceTexts();

  const services = pricing.prestations.filter(isDisplayablePrice);
  const packages = pricing.forfaits.filter(
    (f): f is typeof f & { prix_ttc: number; prix_ht: number } =>
      f.prix_ttc !== null && f.prix_ht !== null,
  );
  const rows = [
    ...services.map((s) => ({
      id: s.id,
      libelle: s.libelle,
      activite: s.activite as string | null,
      mode: s.mode,
      unite: s.unite,
      prix_ttc: s.prix_ttc,
      prix_ht: s.prix_ht,
    })),
    ...packages.map((p) => ({
      id: p.id,
      libelle: p.libelle,
      activite: null as string | null,
      mode: p.mode,
      unite: p.unite,
      prix_ttc: p.prix_ttc,
      prix_ht: p.prix_ht,
    })),
  ];
  const hasPrices = rows.length > 0;
  const hasMandataire = rows.some((r) => r.mode === "mandataire");
  const hourly = services.filter((s) => s.unite === "heure");
  const rate = pricing.credit_impot_taux;
  const fees = services.flatMap((s) =>
    s.frais
      .filter((f): f is { libelle: string; montant_ttc: number } => f.montant_ttc !== null)
      .map((f) => ({ ...f, prestation: s.libelle })),
  );

  return (
    <main id="contenu">
      <Section tone="paper" aria-labelledby="titre">
        <Breadcrumb texts={fil_ariane} items={[{ label: page.ariane }]} className="mb-6" />
        <div className="grid items-center gap-10 lg:grid-cols-[3fr_2fr]">
          <div>
            <Heading level={1} id="titre">
              {page.h1}
            </Heading>
            <Lead className="mt-5">{page.chapo}</Lead>
          </div>
          <Thread illustration="carnet" className="mx-auto w-full max-w-xs lg:max-w-none" />
        </div>
      </Section>

      {hasPrices ? (
        <Section tone="white" aria-labelledby="tarifs">
          <Heading level={2} id="tarifs">
            {page.tarifs.h2}
          </Heading>
          <Lead className="mt-3">{page.tarifs.texte}</Lead>
          {pricing.date_application ? (
            <p className="m-0 mt-2 text-small text-text-soft">
              {page.tarifs.date_application.replace(
                "{date}",
                frenchDate.format(new Date(pricing.date_application)),
              )}
            </p>
          ) : null}
          <div
            className="mt-8 overflow-x-auto focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-focus"
            tabIndex={0}
            role="region"
            aria-label={page.tarifs.h2}
          >
            <table className="w-full border-collapse" data-block="tarifs">
              <caption className="sr-only">{page.tarifs.h2}</caption>
              <thead>
                <tr className="border-b-2 border-teal-700 text-left">
                  <th scope="col" className="p-3">
                    {page.tarifs.colonnes.prestation}
                  </th>
                  <th scope="col" className="p-3">
                    {page.tarifs.colonnes.mode}
                  </th>
                  <th scope="col" className="p-3">
                    {page.tarifs.colonnes.prix_ttc}
                  </th>
                  <th scope="col" className="p-3">
                    {page.tarifs.colonnes.prix_ht}
                  </th>
                  <th scope="col" className="p-3">
                    {page.tarifs.colonnes.apres_credit}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id} className="border-b border-line align-top">
                    <th scope="row" className="p-3 text-left">
                      <span className="block font-bold">{item.libelle}</span>
                      {item.activite ? (
                        <span className="block text-small font-normal text-text-soft">
                          {item.activite}
                        </span>
                      ) : null}
                    </th>
                    <td className="p-3">{tarifs.modes[item.mode]}</td>
                    <td className="tabular-figures p-3">
                      <span className="figure text-h4">{formatEuro(item.prix_ttc)}</span>{" "}
                      <span className="text-small text-text-soft">
                        {tarifs.par_unite.replace("{unite}", tarifs.unites[item.unite])}
                      </span>
                    </td>
                    <td className="tabular-figures p-3 text-text-soft">
                      {formatEuro(item.prix_ht)}
                    </td>
                    <td className="tabular-figures p-3 text-small">
                      {formatEuro(afterTaxCredit(item.prix_ttc, rate))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMandataire ? (
            <MandataireNotice texts={mandataire_notice} className="mt-6 max-w-3xl" />
          ) : null}
          {services.some((s) => s.majorations.some((m) => m.taux !== null)) ? (
            <div className="mt-8">
              <Heading level={3} visual={4}>
                {page.tarifs.majorations_h3}
              </Heading>
              <ul className="mt-3">
                {services.flatMap((s) =>
                  s.majorations
                    .filter((m): m is { libelle: string; taux: number } => m.taux !== null)
                    .map((m) => (
                      <li key={`${s.id}-${m.libelle}`}>
                        {s.libelle} · {m.libelle} : +{formatRate(m.taux)}
                      </li>
                    )),
                )}
              </ul>
            </div>
          ) : null}
          {services.some((s) => s.degressivite.some((d) => d.prix_ttc !== null)) ? (
            <div className="mt-8">
              <Heading level={3} visual={4}>
                {page.tarifs.degressivite_h3}
              </Heading>
              <ul className="mt-3">
                {services.flatMap((s) =>
                  s.degressivite
                    .filter(
                      (d): d is { jusqu_a_heures_par_semaine: number; prix_ttc: number } =>
                        d.jusqu_a_heures_par_semaine !== null && d.prix_ttc !== null,
                    )
                    .map((d) => (
                      <li key={`${s.id}-${d.jusqu_a_heures_par_semaine}`}>
                        {s.libelle} ·{" "}
                        {page.tarifs.degressivite_ligne
                          .replace("{heures}", String(d.jusqu_a_heures_par_semaine))
                          .replace("{prix}", formatEuro(d.prix_ttc))}
                      </li>
                    )),
                )}
              </ul>
            </div>
          ) : null}
        </Section>
      ) : (
        <Section tone="white" aria-labelledby="sans-tarifs">
          <Callout variant="bon-a-savoir" title={page.sans_tarifs.titre} id="sans-tarifs-note">
            <p id="sans-tarifs">{page.sans_tarifs.texte}</p>
          </Callout>
        </Section>
      )}

      {hourly.length > 0 ? (
        <Section tone="teal" aria-labelledby="exemples">
          <Heading level={2} id="exemples">
            {page.exemples.h2}
          </Heading>
          <Lead className="mt-3">
            {page.exemples.texte.replace(
              "{semaines}",
              new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(WEEKS_PER_MONTH),
            )}
          </Lead>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {hourly.map((service) => (
              <div
                key={service.id}
                className="rounded-card border border-line bg-white p-6 shadow-1"
              >
                <Heading level={3} visual={4}>
                  {service.libelle} · {tarifs.modes[service.mode]}
                </Heading>
                <table className="mt-3 w-full border-collapse">
                  <caption className="sr-only">
                    {page.exemples.h2} — {service.libelle}
                  </caption>
                  <thead>
                    <tr className="border-b border-line text-left text-small">
                      <th scope="col" className="py-2">
                        {page.exemples.avant}
                      </th>
                      <th scope="col" className="py-2">
                        {page.exemples.apres}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyEstimates(
                      service.prix_ttc,
                      rate,
                      page.exemples.heures,
                      service.degressivite,
                    ).map((estimate) => (
                      <tr key={estimate.hoursPerWeek} className="border-b border-line">
                        <th scope="row" className="py-2 text-left font-normal">
                          <span className="block">
                            {page.exemples.colonne_heures.replace(
                              "{heures}",
                              String(estimate.hoursPerWeek),
                            )}
                          </span>
                          <span className="figure tabular-figures block text-h4">
                            {formatEuro(estimate.before)}
                          </span>
                        </th>
                        <td className="tabular-figures py-2 text-small">
                          {formatEuro(estimate.after)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {service.mode === "mandataire" ? (
                  <MandataireNotice texts={mandataire_notice} className="mt-4" />
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {fees.length > 0 ? (
        <Section tone="paper" aria-labelledby="frais">
          <Heading level={2} id="frais">
            {page.frais.h2}
          </Heading>
          <Lead className="mt-3">{page.frais.texte}</Lead>
          <ul className="mt-6">
            {fees.map((fee) => (
              <li key={`${fee.prestation}-${fee.libelle}`} className="tabular-figures">
                {fee.libelle} ({fee.prestation}) : {formatEuro(fee.montant_ttc)} TTC
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section tone={hasPrices ? "sand" : "paper"} aria-labelledby="devis">
        <Heading level={2} id="devis">
          {page.devis.titre}
        </Heading>
        <Lead className="mt-3">{page.devis.texte}</Lead>
        <p className="m-0 mt-6">
          <Button href={navigation.demande_href} variant="secondary">
            {boutons.evaluation}
          </Button>
        </p>
      </Section>

      <Section tone="white" aria-labelledby="aides">
        <Heading level={2} id="aides">
          {page.aides.h2}
        </Heading>
        <Lead className="mt-3">{page.aides.texte}</Lead>
        <ul className="m-0 mt-8 grid list-none gap-6 p-0 md:grid-cols-2 lg:grid-cols-3">
          {aides.map((aid) => (
            <li key={aid.id} className="max-w-none">
              <AidCard
                className="h-full"
                name={aid.nom}
                forWho={aid.pour_qui}
                howTo={aid.comment}
                official={{ label: aid.source.libelle, href: aid.source.href }}
                detail={{ label: page.aides.lien_page, href: aid.page }}
                texts={aidTexts}
              />
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="teal" aria-labelledby="appel">
        <Heading level={2} id="appel">
          {page.appel.h2}
        </Heading>
        <Lead className="mt-3">{page.appel.texte}</Lead>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button href={navigation.rappel_href}>{boutons.rappel}</Button>
          <Button href={navigation.demande_href} variant="outline">
            {boutons.budget}
          </Button>
        </div>
      </Section>
    </main>
  );
}
