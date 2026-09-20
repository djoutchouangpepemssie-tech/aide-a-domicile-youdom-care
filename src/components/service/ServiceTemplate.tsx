import Link from "next/link";
import type { MDXContent } from "mdx/types";
import type { ReactNode } from "react";
import { AidCard } from "@/components/blocks/AidCard/AidCard";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { SiteConversionRail } from "@/components/blocks/ConversionRail/SiteConversionRail";
import { FAQ } from "@/components/blocks/FAQ/FAQ";
import { FollowUpTimeline } from "@/components/blocks/FollowUpTimeline/FollowUpTimeline";
import { Hero, type HeroTone } from "@/components/blocks/Hero/Hero";
import { CaregiverFirstQuestion } from "@/components/blocks/HeroGestures/CaregiverFirstQuestion";
import { DischargeChooser } from "@/components/blocks/HeroGestures/DischargeChooser";
import { LifeSheetCard } from "@/components/blocks/HeroGestures/LifeSheetCard";
import { NightChooser } from "@/components/blocks/HeroGestures/NightChooser";
import { PlanningShortcuts } from "@/components/blocks/HeroGestures/PlanningShortcuts";
import { StageChooser } from "@/components/blocks/HeroGestures/StageChooser";
import { stageAnchorId } from "@/components/blocks/HeroGestures/params";
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
import { Reveal } from "@/components/motion/Reveal/Reveal";
import { Tilt } from "@/components/motion/Tilt/Tilt";
import { ReaderProvider } from "@/components/service/ReaderContext";
import { ReaderPhoto } from "@/components/service/ReaderPhoto";
import { ReaderSwitch } from "@/components/service/ReaderSwitch";
import { Callout } from "@/components/ui/Callout/Callout";
import { Heading } from "@/components/ui/Heading/Heading";
import { Icon } from "@/components/ui/Icon/Icon";
import type { IconName } from "@/components/ui/Icon/icons";
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
import { cn } from "@/lib/cn";
import { formatFrenchPhone, toTelHref } from "@/lib/phone";
import { formPaths } from "@/lib/lead/forms";
import { rubricIcons, toIconName } from "./service-icons";

/*
 * Gabarit des pages services et pathologies : les 13 sections de docs/03 §2, dans l'ordre.
 * Tout vient de l'en-tête MDX validé et des fichiers de contenu partagés (semaines types,
 * engagements, tarifs, aides) ; le corps MDX complète la section 3. Aucun fait n'est rédigé
 * ici. Les tons de section alternent, jamais deux teintés d'affilée (docs/02 §6).
 *
 * Expérience (docs/design/CONCEPT.md §4 à §7) :
 * - bannière : photo du hero en priorité (LCP), ton sombre pour la garde de nuit et la présence
 *   24h/24, geste d'entrée choisi par `hero.geste` (src/components/blocks/HeroGestures/), et sur
 *   le pilier personnes âgées le sélecteur de lecteur qui bascule le chapô et la photo ;
 * - sous le hero d'un pilier : une rangée de liens-icônes vers ses sous-pages ;
 * - icônes : de la page (retour au pilier, cartes sœurs), des situations (48 px), des rubriques
 *   d'action (32 px) ; photos de section `photos.actions` (3:2) et `photos.proches` (4:5) ;
 * - rail de conversion (`SiteConversionRail`) à droite des sections 2 à 11 à partir de 64 rem,
 *   dans une colonne superposée qui laisse les fonds de section bord à bord ; masqué devant le
 *   formulaire (section 12) ;
 * - révélations `Reveal` sur les grilles des sections 2, 3, 4, 6 et 10 (visibles sans
 *   JavaScript), `Tilt` 3° sur les cartes de situations et de pages sœurs.
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
  /** Icônes des pages liées (pilier, sœurs), par chemin ; registre `Icon`. */
  linkedIcons: Record<string, string | undefined>;
  /** Sous-pages du pilier, dans l'ordre d'affichage (liens-icônes sous le hero). */
  sousPages: readonly { chemin: string; libelle: string; icone?: string }[];
  /** Première question de « Où en êtes-vous ? » (geste `questionnaire`) ; null si absente. */
  caregiverQuestion: {
    question: string;
    reponses: readonly { valeur: number; libelle: string }[];
    href: string;
  } | null;
  confidentialiteHref: string;
  tarifsHref: string;
}

function fill(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (out, [key, value]) => out.replaceAll(`{${key}}`, value),
    template,
  );
}

/** Colonne du rail : 17,5 rem (280 px) + 3 rem d'écart, réservés à droite des sections 2 à 11. */
const withRail = "lg:[&>.container-site]:pr-82";

const sisterCard =
  "flex min-h-14 items-center gap-3 rounded-card border border-line bg-white px-4 py-2 font-bold " +
  "no-underline shadow-1 transition-[box-shadow] [transition-duration:var(--duration-base)] " +
  "hover:shadow-2 motion-reduce:transition-none";

function SisterLink({
  href,
  label,
  icon,
  prefetch,
}: {
  href: string;
  label: string;
  icon: IconName | undefined;
  prefetch?: boolean;
}) {
  return (
    <Tilt as="article" max={3} className="h-full">
      <Link href={href} prefetch={prefetch} className={cn(sisterCard, "h-full")}>
        {icon ? <Icon name={icon} /> : null}
        <span className="min-w-0 flex-1">{label}</span>
      </Link>
    </Tilt>
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
    linkedIcons,
    sousPages,
    caregiverQuestion,
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
  const formHref = formPaths[page.formulaire];
  // Un seul bouton framboise, dont le libellé suit le public (docs/design/CONCEPT.md §7).
  const primaryLabel =
    page.formulaire === "sortie-hospitalisation"
      ? texts.boutons.sortie_hopital
      : page.public === "aidant"
        ? texts.boutons.aidant
        : page.public === "enfant-handicap"
          ? texts.boutons.enfant
          : texts.boutons.demande_detaillee;

  const hero = page.hero ?? null;
  const heroTone: HeroTone = hero?.ton ?? "clair";
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

  let gesture: ReactNode = null;
  switch (hero?.geste) {
    case "stades":
      gesture = <StageChooser texts={t.gestes.stades} tone={heroTone} />;
      break;
    case "planning":
      gesture = <PlanningShortcuts texts={t.gestes.planning} formHref={formHref} tone={heroTone} />;
      break;
    case "fiche-de-vie":
      gesture = (
        <LifeSheetCard
          texts={t.gestes.fiche_de_vie}
          buttonLabel={texts.boutons.enfant}
          formHref={formPaths["enfant-handicap"]}
        />
      );
      break;
    case "questionnaire":
      gesture = caregiverQuestion ? (
        <CaregiverFirstQuestion
          question={caregiverQuestion.question}
          reponses={caregiverQuestion.reponses}
          href={caregiverQuestion.href}
          mention={t.gestes.questionnaire.mention}
          tone={heroTone}
        />
      ) : null;
      break;
    case "nuit":
      gesture = (
        <NightChooser
          texts={t.gestes.nuit}
          formHref={formPaths["nuit-24h"]}
          variant={page.chemin.includes("24h") ? "duree" : "nuit"}
          tone={heroTone}
        />
      );
      break;
    case "sortie":
      gesture = (
        <DischargeChooser
          texts={t.gestes.sortie}
          formHref={formPaths["sortie-hospitalisation"]}
          tone={heroTone}
        />
      );
      break;
    default:
      // `lecteur` : le sélecteur est déjà dans le chapô (ReaderSwitch) ; sans geste : rien.
      gesture = null;
  }

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
      primary={{ label: primaryLabel, href: formHref }}
      secondary={{ label: texts.boutons.rappel, href: navigation.rappel_href }}
      phone={phone && telHref ? { label: formatFrenchPhone(phone), href: telHref } : null}
      reassurance={page.reassurance}
      media={heroMedia}
      gesture={gesture}
      tone={heroTone}
    />
  );
  const pageIcon = toIconName(page.icone);
  const actionsPhoto = page.photos?.actions ?? null;
  const prochesPhoto = page.photos?.proches ?? null;

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
        {page.type === "pilier" && sousPages.length >= 2 ? (
          <nav aria-label={t.sous_pages_nom} className="mt-10" data-sous-pages>
            <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
              {sousPages.map((sousPage) => {
                const icon = toIconName(sousPage.icone);
                return (
                  <li key={sousPage.chemin} className="max-w-none">
                    <Link
                      href={sousPage.chemin}
                      prefetch={false}
                      className={cn(
                        "inline-flex min-h-12 items-center gap-2 rounded-button border px-4 font-bold no-underline",
                        "transition-colors [transition-duration:var(--duration-base)] motion-reduce:transition-none",
                        heroTone === "sombre"
                          ? "border-white/40 text-white hover:bg-white/10"
                          : "border-line bg-white text-teal-900 hover:border-teal-700 hover:bg-teal-50",
                      )}
                    >
                      {icon ? (
                        <Icon name={icon} tone={heroTone === "sombre" ? "white" : "teal"} />
                      ) : null}
                      <span>{sousPage.libelle}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}
      </Section>

      <div className="relative" data-rail-zone>
        {/* 2. Vous vous reconnaissez ? */}
        <Section tone="white" aria-labelledby="situations" className={withRail}>
          <Heading level={2} id="situations">
            {t.situations_h2}
          </Heading>
          <Reveal
            as="ul"
            variant="stagger"
            className="m-0 mt-8 grid list-none gap-6 p-0 md:grid-cols-2"
          >
            {page.situations.map((situation) => {
              const icon = toIconName(situation.icone);
              return (
                <li key={situation.titre} className="max-w-none">
                  <Tilt
                    as="article"
                    max={3}
                    className="flex h-full flex-col rounded-card border border-line bg-white p-6 shadow-1"
                    data-situation
                  >
                    {icon ? (
                      <Icon name={icon} style={{ width: "3rem", height: "3rem" }} data-size="48" />
                    ) : null}
                    <p className={cn("heading-4 m-0 text-teal-900", icon && "mt-4")}>
                      {situation.titre}
                    </p>
                    <p className="m-0 mt-3">{situation.texte}</p>
                  </Tilt>
                </li>
              );
            })}
          </Reveal>
        </Section>

        {/* 3. Ce que nous faisons, concrètement */}
        <Section tone="paper" aria-labelledby="actions" className={withRail}>
          <Heading level={2} id="actions">
            {t.actions_h2}
          </Heading>
          <div
            className={cn(
              "mt-8",
              actionsPhoto &&
                "lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-10",
            )}
          >
            {actionsPhoto ? (
              <PhotoFigure
                src={actionsPhoto.src}
                alt={actionsPhoto.alt}
                focal={actionsPhoto.focal}
                ratio="3:2"
                mobileRatio="16:9"
                sizes={photoSizes.half}
                className="mb-8 lg:order-last lg:mb-0"
              />
            ) : null}
            <Reveal variant="stagger" className="grid gap-8 md:grid-cols-2">
              {page.actions.map((action) => (
                <div key={action.rubrique} data-rubrique={action.rubrique}>
                  <Heading level={3} visual={4} className="flex items-center gap-3">
                    <Icon name={rubricIcons[action.rubrique]} size="lg" />
                    <span>{t.rubriques[action.rubrique]}</span>
                  </Heading>
                  <ul className="mt-3 list-disc pl-5">
                    {action.exemples.map((exemple) => (
                      <li key={exemple}>{exemple}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </Reveal>
          </div>
          {Body ? (
            <Prose className="mt-10">
              <Body />
            </Prose>
          ) : null}
        </Section>

        {/* 4. Un accompagnement qui évolue */}
        <Section tone="white" aria-labelledby="stades" className={withRail}>
          <Heading level={2} id="stades">
            {t.stades_h2}
          </Heading>
          <Reveal className="mt-8">
            <StageCards
              ids={page.stades.map((_, index) => stageAnchorId(index))}
              stages={page.stades.map((stade) => ({ title: stade.titre, text: stade.texte }))}
            />
          </Reveal>
        </Section>

        {/* 5. Exemple de semaine */}
        {weekExample ? (
          <Section tone="sand" aria-labelledby="semaine" className={withRail}>
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
        <Section tone="white" aria-labelledby="suivi" className={withRail}>
          <Heading level={2} id="suivi">
            {t.suivi_h2}
          </Heading>
          <Reveal className="mt-8">
            <FollowUpTimeline aria-labelledby="suivi" milestones={commitments.suivi.jalons} />
          </Reveal>
        </Section>

        {/* 7. Et pour vous, les proches */}
        <Section tone="teal" aria-labelledby="proches" className={withRail}>
          <div
            className={cn(
              prochesPhoto &&
                "lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center lg:gap-10",
            )}
          >
            <div>
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
            </div>
            {prochesPhoto ? (
              <PhotoFigure
                src={prochesPhoto.src}
                alt={prochesPhoto.alt}
                focal={prochesPhoto.focal}
                ratio="4:5"
                mobileRatio="3:2"
                sizes="(min-width: 64rem) 288px, 100vw"
                className="mt-8 lg:mt-0"
              />
            ) : null}
          </div>
        </Section>

        {/* 8. Qui intervient ? */}
        <Section tone="white" aria-labelledby="intervenants" className={withRail}>
          <Heading level={2} id="intervenants">
            {t.intervenants_h2}
          </Heading>
          <Prose className="mt-6">
            <p>{page.intervenants.texte}</p>
          </Prose>
        </Section>

        {/* 9. Ce que nous ne faisons pas */}
        <Section tone="paper" aria-labelledby="ne-faisons-pas" className={withRail}>
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
        <Section tone="white" aria-labelledby="cout" className={withRail}>
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
          <Reveal
            as="ul"
            variant="stagger"
            className="m-0 mt-8 grid list-none gap-6 p-0 md:grid-cols-2 xl:grid-cols-3"
          >
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
          </Reveal>
          <p className="m-0 mt-8">
            <Link href={tarifsHref} className="font-bold">
              {t.cout_lien}
            </Link>
          </p>
        </Section>

        {/* 11. Questions fréquentes */}
        <Section tone="sand" aria-labelledby="faq" className={withRail}>
          <Heading level={2} id="faq">
            {t.faq_h2}
          </Heading>
          <FAQ
            className="mt-8"
            items={page.faq.map((item) => ({ question: item.question, answer: item.reponse }))}
          />
        </Section>

        {/* Rail de conversion : colonne de droite superposée aux sections 2 à 11, à partir de 64 rem. */}
        <div
          className="container-site pointer-events-none absolute inset-0 hidden lg:block"
          data-rail-column
        >
          <div className="pointer-events-auto ml-auto h-full w-70">
            <SiteConversionRail formHref="#formulaire" formId="formulaire" />
          </div>
        </div>
      </div>

      {/* 12. Formulaire dédié */}
      <Section
        tone="white"
        id="formulaire"
        aria-labelledby="formulaire-titre"
        className="scroll-mt-20"
      >
        <Heading level={2} id="formulaire-titre">
          {pageIcon ? (
            <span className="flex items-center gap-3">
              <Icon name={pageIcon} size="lg" />
              <span>{t.formulaire_h2}</span>
            </span>
          ) : (
            t.formulaire_h2
          )}
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
          <ul className="m-0 mt-4 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {page.pilier ? (
              <li className="max-w-none">
                <SisterLink
                  href={page.pilier}
                  label={fill(t.pilier_lien, {
                    titre: linkedTitles[page.pilier] ?? t.publics[page.public],
                  })}
                  icon={toIconName(linkedIcons[page.pilier])}
                />
              </li>
            ) : null}
            {page.soeurs.map((soeur) => (
              <li key={soeur} className="max-w-none">
                <SisterLink
                  href={soeur}
                  label={linkedTitles[soeur] ?? soeur}
                  icon={toIconName(linkedIcons[soeur])}
                  prefetch={false}
                />
              </li>
            ))}
            <li className="max-w-none">
              <SisterLink
                href="/aide-a-domicile/"
                label={t.commune_lien}
                icon="maison"
                prefetch={false}
              />
            </li>
          </ul>
        </nav>
      </Section>
    </main>
  );
}
