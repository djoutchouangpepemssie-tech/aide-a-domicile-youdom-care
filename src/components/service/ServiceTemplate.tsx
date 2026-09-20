import Link from "next/link";
import type { MDXContent } from "mdx/types";
import { AidCard } from "@/components/blocks/AidCard/AidCard";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { FAQ } from "@/components/blocks/FAQ/FAQ";
import { FollowUpTimeline } from "@/components/blocks/FollowUpTimeline/FollowUpTimeline";
import { Hero } from "@/components/blocks/Hero/Hero";
import { ReaderProvider } from "@/components/service/ReaderContext";
import { ReaderPhoto } from "@/components/service/ReaderPhoto";
import { ReaderSwitch } from "@/components/service/ReaderSwitch";
import { MandataireNotice } from "@/components/blocks/MandataireNotice/MandataireNotice";
import { isDisplayablePrice, PriceCard } from "@/components/blocks/PriceCard/PriceCard";
import { SourcesList, formatFrenchDate } from "@/components/blocks/SourcesList/SourcesList";
import { StageCards } from "@/components/blocks/StageCards/StageCards";
import { WeekPlanner } from "@/components/blocks/WeekPlanner/WeekPlanner";
import { WeekStory } from "@/components/blocks/WeekStory/WeekStory";
import { DetailedForm } from "@/components/forms/DetailedForm/DetailedForm";
import { RappelForm } from "@/components/forms/RappelForm/RappelForm";
import { HospitalDischargeForm } from "@/components/forms/SpecialForms/HospitalDischargeForm";
import { Section } from "@/components/layout/Section/Section";
import { Callout } from "@/components/ui/Callout/Callout";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { PhotoFigure, photoSizes } from "@/components/ui/PhotoFigure/PhotoFigure";
import { Prose } from "@/components/ui/Prose/Prose";
import type { ServicePage } from "@/content/service-schema";
import type {
  Aids,
  Commitments,
  FormDefinition,
  InterfaceTexts,
  Navigation,
  Pricing,
  SpecialForms,
  WeekExamples,
} from "@/content/schemas";
import type { BudgetBasis } from "@/lib/pricing/pricing";
import { formatFrenchPhone, toTelHref } from "@/lib/phone";
import { formPaths } from "@/lib/lead/forms";

/*
 * Gabarit des pages services et pathologies : les 13 sections de docs/03 §2, dans l'ordre.
 * Tout vient de l'en-tête MDX validé et des fichiers de contenu partagés (semaines types,
 * engagements, tarifs, aides) ; le corps MDX complète la section 3. Aucun fait n'est rédigé
 * ici. Les tons de section alternent, jamais deux teintés d'affilée (docs/02 §6).
 * Bannière (docs/design/CONCEPT.md §4) : photo du hero en priorité (LCP), ton sombre pour la
 * garde de nuit et la présence 24h/24 ; sur le pilier personnes âgées, le sélecteur de lecteur
 * bascule le chapô et la photo.
 */

export interface ServiceTemplateData {
  page: ServicePage;
  Body: MDXContent | null;
  texts: InterfaceTexts;
  navigation: Navigation;
  phone: string | null;
  weekExample: WeekExamples["exemples"][number] | null;
  commitments: Commitments;
  aids: Aids["aides"];
  pricing: Pricing;
  definition: FormDefinition | null;
  specialForms: SpecialForms;
  budget: BudgetBasis | null;
  /** Titres des pages liées (pilier, sœurs), par chemin. */
  linkedTitles: Record<string, string>;
  confidentialiteHref: string;
  tarifsHref: string;
}

function fill(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (out, [key, value]) => out.replaceAll(`{${key}}`, value),
    template,
  );
}

export function ServiceTemplate({ data }: { data: ServiceTemplateData }) {
  const {
    page,
    Body,
    texts,
    navigation,
    phone,
    weekExample,
    commitments,
    aids,
    pricing,
    definition,
    specialForms,
    budget,
    linkedTitles,
    confidentialiteHref,
    tarifsHref,
  } = data;
  const t = texts.service;
  const telHref = phone ? toTelHref(phone) : null;
  const service = pricing.prestations.find(isDisplayablePrice) ?? null;
  const relevantAids = page.aides
    .map((id) => aids.find((aid) => aid.id === id))
    .filter((aid): aid is NonNullable<typeof aid> => aid !== undefined);
  const crumbs = [
    ...(page.pilier
      ? [{ label: linkedTitles[page.pilier] ?? t.publics[page.public], href: page.pilier }]
      : []),
    { label: page.h1 },
  ];
  const formTexts = {
    ...texts.formulaires,
    recherche: texts.recherche_commune,
    planning: texts.planning,
    planningTexts: {
      semaine_type: texts.semaine_type,
      formulaires: texts.formulaires,
      planning: texts.planning,
    },
  };

  const hero = page.hero ?? null;
  const heroTone = hero?.ton ?? "clair";
  const withReader = page.chapo_pour_soi !== undefined;
  const heroMedia = hero ? (
    withReader && hero.photo_pour_soi ? (
      <ReaderPhoto proche={hero.photo} soi={hero.photo_pour_soi} />
    ) : (
      <PhotoFigure
        src={hero.photo.src}
        alt={hero.photo.alt}
        focal={hero.photo.focal}
        ratio="4:5"
        mobileRatio="16:9"
        radius={28}
        sizes={photoSizes.hero}
        priority
      />
    )
  ) : undefined;
  const banner = (
    <Hero
      surtitle={t.publics[page.public]}
      title={page.h1}
      lead={
        page.chapo_pour_soi ? (
          <ReaderSwitch
            proche={`${page.chapo} ${page.promesse.join(" ")}`}
            soi={`${page.chapo_pour_soi} ${page.promesse.join(" ")}`}
            texts={t.lecteur}
          />
        ) : (
          `${page.chapo} ${page.promesse.join(" ")}`
        )
      }
      primary={{ label: texts.boutons.demande_detaillee, href: formPaths[page.formulaire] }}
      secondary={{ label: texts.boutons.rappel, href: navigation.rappel_href }}
      phone={phone && telHref ? { label: formatFrenchPhone(phone), href: telHref } : null}
      reassurance={page.reassurance}
      media={heroMedia}
      tone={heroTone}
    />
  );

  return (
    <main id="contenu" data-service={page.chemin} data-statut={page.statut}>
      {page.statut === "a_relire" ? (
        <div className="container-site pt-6">
          <Callout variant="attention">{t.non_relu}</Callout>
        </div>
      ) : null}
      <div className="container-site pt-6">
        <Breadcrumb texts={texts.fil_ariane} items={crumbs} />
      </div>

      {/* 1. Bannière */}
      <Section
        tone={heroTone === "sombre" ? "dark" : "paper"}
        aria-label={t.publics[page.public]}
        className="pt-8!"
        data-hero-tone={heroTone}
      >
        {withReader ? <ReaderProvider>{banner}</ReaderProvider> : banner}
      </Section>

      {/* 2. Vous vous reconnaissez ? */}
      <Section tone="white" aria-labelledby="situations">
        <Heading level={2} id="situations">
          {t.situations_h2}
        </Heading>
        <ul className="m-0 mt-8 grid list-none gap-6 p-0 md:grid-cols-2">
          {page.situations.map((situation) => (
            <li
              key={situation.titre}
              className="max-w-none rounded-card border border-line bg-white p-6 shadow-1"
            >
              <p className="heading-4 m-0">{situation.titre}</p>
              <p className="m-0 mt-3">{situation.texte}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* 3. Ce que nous faisons, concrètement */}
      <Section tone="paper" aria-labelledby="actions">
        <Heading level={2} id="actions">
          {t.actions_h2}
        </Heading>
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          {page.actions.map((action) => (
            <div key={action.rubrique}>
              <Heading level={3} visual={4}>
                {t.rubriques[action.rubrique]}
              </Heading>
              <ul className="mt-3 list-disc pl-5">
                {action.exemples.map((exemple) => (
                  <li key={exemple}>{exemple}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {Body ? (
          <Prose className="mt-10">
            <Body />
          </Prose>
        ) : null}
      </Section>

      {/* 4. Un accompagnement qui évolue */}
      <Section tone="white" aria-labelledby="stades">
        <Heading level={2} id="stades">
          {t.stades_h2}
        </Heading>
        <StageCards
          className="mt-8"
          stages={page.stades.map((stade) => ({ title: stade.titre, text: stade.texte }))}
        />
      </Section>

      {/* 5. Exemple de semaine */}
      {weekExample ? (
        <Section tone="sand" aria-labelledby="semaine">
          <Heading level={2} id="semaine">
            {t.semaine_h2}
          </Heading>
          <div className="mt-8 rounded-block bg-white p-4 shadow-1 sm:p-6">
            <WeekPlanner
              title={weekExample.titre}
              context={weekExample.contexte}
              entries={weekExample.entrees}
              texts={texts.semaine_type}
            />
          </div>
          <WeekStory
            className="mt-8"
            story={page.semaine_type.recit}
            photo={page.semaine_type.photo ?? weekExample.photo ?? null}
          />
        </Section>
      ) : null}

      {/* 6. Le suivi */}
      <Section tone="white" aria-labelledby="suivi">
        <Heading level={2} id="suivi">
          {t.suivi_h2}
        </Heading>
        <FollowUpTimeline
          aria-labelledby="suivi"
          className="mt-8"
          milestones={commitments.suivi.jalons}
        />
      </Section>

      {/* 7. Et pour vous, les proches */}
      <Section tone="teal" aria-labelledby="proches">
        <Heading level={2} id="proches">
          {t.proches_h2}
        </Heading>
        <Lead className="mt-3">{page.proches.texte}</Lead>
        <ul className="m-0 mt-6 flex list-none flex-wrap gap-4 p-0">
          <li className="max-w-none">
            <Link href="/aidants/" prefetch={false} className="font-bold">
              {t.proches_lien}
            </Link>
          </li>
          <li className="max-w-none">
            <Link href="/aidants/solutions-de-repit/" prefetch={false} className="font-bold">
              {t.repit_lien}
            </Link>
          </li>
        </ul>
      </Section>

      {/* 8. Qui intervient ? */}
      <Section tone="white" aria-labelledby="intervenants">
        <Heading level={2} id="intervenants">
          {t.intervenants_h2}
        </Heading>
        <Prose className="mt-6">
          <p>{page.intervenants.texte}</p>
        </Prose>
      </Section>

      {/* 9. Ce que nous ne faisons pas */}
      <Section tone="paper" aria-labelledby="ne-faisons-pas">
        <Heading level={2} id="ne-faisons-pas">
          {t.ne_faisons_pas_h2}
        </Heading>
        <Callout variant="ne-faisons-pas" className="mt-6" data-section="ne-faisons-pas">
          <ul className="m-0 list-disc pl-5">
            {page.ne_faisons_pas.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Callout>
      </Section>

      {/* 10. Combien ça coûte, quelles aides ? */}
      <Section tone="white" aria-labelledby="cout">
        <Heading level={2} id="cout">
          {t.cout_h2}
        </Heading>
        {service ? (
          <div className="mt-8 max-w-xl">
            <PriceCard
              service={service}
              texts={texts.tarifs}
              creditImpotTaux={pricing.credit_impot_taux}
              notice={
                service.mode === "mandataire" ? (
                  <MandataireNotice texts={texts.mandataire_notice} className="mt-4" />
                ) : undefined
              }
            />
          </div>
        ) : null}
        <ul className="m-0 mt-8 grid list-none gap-6 p-0 md:grid-cols-2 lg:grid-cols-3">
          {relevantAids.map((aid) => (
            <li key={aid.id} className="max-w-none">
              <AidCard
                className="h-full"
                name={aid.nom}
                forWho={aid.pour_qui}
                howTo={aid.comment}
                official={{ label: aid.source.libelle, href: aid.source.href }}
                detail={{ label: texts.aides.combien, href: aid.page }}
                headingLevel={3}
                texts={texts.aides}
              />
            </li>
          ))}
        </ul>
        <p className="m-0 mt-8">
          <Link href={tarifsHref} className="font-bold">
            {t.cout_lien}
          </Link>
        </p>
      </Section>

      {/* 11. Questions fréquentes */}
      <Section tone="sand" aria-labelledby="faq">
        <Heading level={2} id="faq">
          {t.faq_h2}
        </Heading>
        <FAQ
          className="mt-8"
          items={page.faq.map((item) => ({ question: item.question, answer: item.reponse }))}
        />
      </Section>

      {/* 12. Formulaire dédié */}
      <Section tone="white" aria-labelledby="formulaire">
        <Heading level={2} id="formulaire">
          {t.formulaire_h2}
        </Heading>
        <Lead className="mt-3">{t.formulaire_texte}</Lead>
        <div className="mt-8 max-w-3xl">
          {page.formulaire === "rappel" ? (
            <RappelForm
              texts={{
                ...texts.formulaires,
                ...texts.formulaires.rappel,
                recherche: texts.recherche_commune,
              }}
              phone={phone}
              confidentialiteHref={confidentialiteHref}
            />
          ) : page.formulaire === "sortie-hospitalisation" ? (
            <HospitalDischargeForm
              texts={formTexts}
              page={specialForms.sortie_hospitalisation}
              phone={phone}
              confidentialiteHref={confidentialiteHref}
            />
          ) : definition ? (
            <DetailedForm
              definition={definition}
              texts={formTexts}
              phone={phone}
              confidentialiteHref={confidentialiteHref}
              budget={budget}
            />
          ) : null}
        </div>
      </Section>

      {/* 13. Sources et relecture + maillage */}
      <Section tone="paper" aria-labelledby="sources">
        <Heading level={2} id="sources">
          {t.sources_h2}
        </Heading>
        <SourcesList
          className="mt-6"
          sources={page.sources}
          texts={{ ...texts.page_aide, lien_externe: texts.aides.lien_externe }}
        />
        <p className="mt-6 text-small text-text-soft">
          {fill(t.auteur, { nom: page.auteur.nom, fonction: page.auteur.fonction })}
          {page.relu_par ? (
            <>
              <br />
              {fill(t.relu_par, {
                nom: page.relu_par.nom,
                fonction: page.relu_par.fonction,
                date: formatFrenchDate(page.relu_par.date),
              })}
            </>
          ) : null}
          <br />
          {fill(t.maj, { date: formatFrenchDate(page.maj) })}
        </p>
        <nav aria-labelledby="soeurs" className="mt-10">
          <Heading level={3} id="soeurs" visual={4}>
            {t.soeurs_h2}
          </Heading>
          <ul className="m-0 mt-3 flex list-none flex-wrap gap-4 p-0">
            {page.pilier ? (
              <li className="max-w-none">
                <Link href={page.pilier} className="font-bold">
                  {fill(t.pilier_lien, {
                    titre: linkedTitles[page.pilier] ?? t.publics[page.public],
                  })}
                </Link>
              </li>
            ) : null}
            {page.soeurs.map((soeur) => (
              <li key={soeur} className="max-w-none">
                <Link href={soeur} prefetch={false} className="font-bold">
                  {linkedTitles[soeur] ?? soeur}
                </Link>
              </li>
            ))}
            <li className="max-w-none">
              <Link href="/aide-a-domicile/" prefetch={false} className="font-bold">
                {t.commune_lien}
              </Link>
            </li>
          </ul>
        </nav>
      </Section>
    </main>
  );
}
