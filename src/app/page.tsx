import { Commitments } from "@/components/blocks/Commitments/Commitments";
import { Hero } from "@/components/blocks/Hero/Hero";
import { PriceCard, isDisplayablePrice } from "@/components/blocks/PriceCard/PriceCard";
import { SituationCard } from "@/components/blocks/SituationCard/SituationCard";
import { StageCards } from "@/components/blocks/StageCards/StageCards";
import { StepsTimeline } from "@/components/blocks/StepsTimeline/StepsTimeline";
import { TerritorySearch } from "@/components/blocks/TerritorySearch/TerritorySearch";
import Link from "next/link";
import { WeekPlanner } from "@/components/blocks/WeekPlanner/WeekPlanner";
import { Section } from "@/components/layout/Section/Section";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { Tabs } from "@/components/ui/Tabs/Tabs";
import { Thread } from "@/components/ui/Thread/Thread";
import {
  getCommitments,
  getHomePage,
  getInterfaceTexts,
  getNavigation,
  getPricing,
  getSiteConfig,
  getWeekExamples,
} from "@/content/loader";
import { isProduction } from "@/lib/env";
import { formatFrenchPhone, toTelHref } from "@/lib/phone";

/*
 * Accueil : les douze blocs de docs/01 §4. Blocs 1 à 4 (P2.1), 5 à 8 (P2.2), 9 à 12 (P2.3).
 * Alternance des fonds : paper → white → teal → paper → sand → white → teal → paper (docs/02 §2).
 */
export default function Home() {
  const page = getHomePage();
  const { contact } = getSiteConfig();
  const navigation = getNavigation();
  const { boutons, semaine_type, tarifs, recherche_commune, formulaires } = getInterfaceTexts();
  const { engagements } = getCommitments();
  const { agences } = getSiteConfig();
  const agencyCount = new Intl.NumberFormat("fr-FR");
  const searchTexts = { ...recherche_commune, hors: formulaires.hors_idf };
  const pricing = getPricing();
  const weekExamples = getWeekExamples();

  const telHref = contact.telephone_principal ? toTelHref(contact.telephone_principal) : null;
  const phone =
    contact.telephone_principal && telHref
      ? {
          label: page.banniere.lien_telephone.replace(
            "{téléphone}",
            formatFrenchPhone(contact.telephone_principal),
          ),
          href: telHref,
        }
      : null;

  const validated = new Set(engagements.filter((e) => e.valide).map((e) => e.code));
  const steps = page.etapes.items.map((step) => {
    const showCommitment =
      step.texte_engagement !== undefined &&
      (!isProduction() || (step.engagement !== undefined && validated.has(step.engagement)));
    return {
      title: step.titre,
      text: showCommitment ? `${step.texte} ${step.texte_engagement}` : step.texte,
    };
  });

  const weekTabs = page.semaine.onglets.flatMap((tab) => {
    const example = weekExamples.exemples.find((e) => e.id === tab.exemple);
    if (!example) return [];
    return [
      {
        id: example.id,
        label: tab.libelle,
        content: (
          <WeekPlanner
            title={tab.libelle}
            context={example.contexte}
            entries={example.entrees}
            texts={semaine_type}
          />
        ),
      },
    ];
  });

  const featuredService = pricing.prestations.find(isDisplayablePrice);

  return (
    <main id="contenu">
      <Section tone="paper" aria-label={page.banniere.sur_titre}>
        <Hero
          surtitle={page.banniere.sur_titre}
          title={page.banniere.h1}
          lead={page.banniere.chapo}
          primary={{ label: boutons.rappel, href: navigation.rappel_href }}
          secondary={{ label: boutons.demande_detaillee, href: navigation.demande_href }}
          phone={phone}
          reassurance={page.banniere.reassurance}
          footnote={{ text: page.banniere.note_astérisque, href: page.banniere.note_href }}
          illustration={page.banniere.illustration}
        />
      </Section>

      <Section tone="white" aria-labelledby="situations">
        <Heading level={2} id="situations">
          {page.situations.h2}
        </Heading>
        <Lead className="mt-3">{page.situations.texte}</Lead>
        <ul className="m-0 mt-8 grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {page.situations.cartes.map((carte) => (
            <li key={carte.href} className="max-w-none">
              <SituationCard
                quote={carte.citation}
                text={carte.texte}
                href={carte.href}
                linkLabel={carte.lien}
                illustration={carte.illustration}
                className="h-full"
              />
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="teal" aria-labelledby="engagements">
        <Heading level={2} id="engagements">
          {page.engagements.h2}
        </Heading>
        <Commitments
          aria-labelledby="engagements"
          className="mt-8"
          items={page.engagements.items}
          commitments={engagements}
        />
      </Section>

      <Section tone="paper" aria-labelledby="neuro">
        <Heading level={2} id="neuro">
          {page.neuro.h2}
        </Heading>
        <Lead className="mt-3">{page.neuro.texte}</Lead>
        <StageCards
          aria-labelledby="neuro"
          className="mt-8"
          stages={page.neuro.stades.map((stade) => ({
            title: stade.titre,
            text: stade.texte ? <p>{stade.texte}</p> : undefined,
          }))}
        />
        <p className="m-0 mt-8">
          <Button href={page.neuro.href} variant="secondary">
            {page.neuro.bouton}
          </Button>
        </p>
      </Section>

      <Section tone="sand" aria-labelledby="semaine">
        <Heading level={2} id="semaine">
          {page.semaine.h2}
        </Heading>
        <Lead className="mt-3">{page.semaine.texte}</Lead>
        <div className="mt-8 rounded-block bg-white p-4 shadow-1 sm:p-6">
          <Tabs items={weekTabs} label={page.semaine.onglets_nom} />
        </div>
        <p className="m-0 mt-8">
          <Button href={navigation.demande_href} variant="secondary">
            {boutons.planning}
          </Button>
        </p>
      </Section>

      <Section tone="white" aria-labelledby="etapes">
        <Heading level={2} id="etapes">
          {page.etapes.h2}
        </Heading>
        <StepsTimeline aria-labelledby="etapes" className="mt-8 max-w-2xl" steps={steps} />
      </Section>

      <Section tone="teal" aria-labelledby="prix">
        <Heading level={2} id="prix">
          {page.prix.h2}
        </Heading>
        <Lead className="mt-3">{page.prix.texte}</Lead>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {featuredService ? (
            <div className="flex flex-col gap-4" data-block="tarifs">
              <Heading level={3} visual={4}>
                {page.prix.carte_tarifs.titre}
              </Heading>
              <PriceCard
                service={featuredService}
                creditImpotTaux={pricing.credit_impot_taux}
                exampleHoursPerWeek={10}
                texts={tarifs}
              />
              <p className="m-0">
                <Button href={page.prix.carte_tarifs.href} variant="outline">
                  {page.prix.carte_tarifs.bouton}
                </Button>
              </p>
            </div>
          ) : null}
          <Card
            as="article"
            className="flex flex-col"
            data-block="aides"
            aria-labelledby="aides-titre"
          >
            <Heading level={3} visual={4} id="aides-titre">
              {page.prix.carte_aides.titre}
            </Heading>
            <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
              {page.prix.carte_aides.aides.map((aide) => (
                <li
                  key={aide}
                  className="max-w-none rounded-full bg-green-50 px-3 py-1 text-small font-bold"
                >
                  {aide}
                </li>
              ))}
            </ul>
            <p className="m-0 mt-auto pt-6">
              <Button href={page.prix.carte_aides.href} variant="outline">
                {boutons.lecture_aides}
              </Button>
            </p>
          </Card>
        </div>
      </Section>

      <Section tone="paper" aria-labelledby="proches">
        <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <Heading level={2} id="proches">
              {page.proches.h2}
            </Heading>
            <Lead className="mt-3">{page.proches.texte}</Lead>
            <p className="m-0 mt-8">
              <Button href={page.proches.href} variant="secondary">
                {boutons.aidant}
              </Button>
            </p>
          </div>
          <Thread illustration={page.proches.illustration} className="mx-auto w-40 md:w-56" />
        </div>
      </Section>

      <Section tone="white" aria-labelledby="territoire">
        <Heading level={2} id="territoire">
          {page.territoire.h2}
        </Heading>
        <Lead className="mt-3">
          {page.territoire.texte.replace("{agences}", agencyCount.format(agences.length))}
        </Lead>
        <TerritorySearch
          className="mt-8 max-w-2xl"
          texts={searchTexts}
          agencies={Object.fromEntries(agences.map((a) => [a.id, a.nom]))}
        />
      </Section>

      {/* Bloc 10 (magazine) : affiché quand content/magazine contient des articles (P7). */}

      <Section tone="teal" aria-labelledby="appel">
        <Heading level={2} id="appel">
          {page.appel_final.h2}
        </Heading>
        <Lead className="mt-3">{page.appel_final.texte}</Lead>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button href={navigation.rappel_href}>{boutons.rappel}</Button>
          <Button href={navigation.demande_href} variant="outline">
            {boutons.demande_detaillee}
          </Button>
          {telHref && contact.telephone_principal ? (
            <Button href={telHref} variant="link" className="tabular-figures">
              {page.appel_final.bouton_telephone.replace(
                "{téléphone}",
                formatFrenchPhone(contact.telephone_principal),
              )}
            </Button>
          ) : null}
        </div>
      </Section>

      <Section tone="paper" aria-labelledby="recrutement" className="py-8!">
        <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1">
          <strong id="recrutement">{page.recrutement.accroche}</strong>
          <span>{page.recrutement.texte}</span>
          <Link href={page.recrutement.href} className="font-bold">
            {page.recrutement.lien}
          </Link>
        </p>
      </Section>
    </main>
  );
}
