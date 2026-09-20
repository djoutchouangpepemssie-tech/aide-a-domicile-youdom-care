import { Commitments, visibleCommitments } from "@/components/blocks/Commitments/Commitments";
import { Hero } from "@/components/blocks/Hero/Hero";
import { withParam } from "@/components/blocks/HeroGestures/params";
import { HeroPicker } from "@/components/blocks/Parcours/HeroPicker";
import { ParcoursProvider } from "@/components/blocks/Parcours/ParcoursProvider";
import { SituationPanel } from "@/components/blocks/Parcours/SituationPanel";
import { loadPanelPublics } from "@/components/blocks/Parcours/situations";
import { PriceCard, isDisplayablePrice } from "@/components/blocks/PriceCard/PriceCard";
import { SituationCard } from "@/components/blocks/SituationCard/SituationCard";
import { StageCards } from "@/components/blocks/StageCards/StageCards";
import { StepsTimeline } from "@/components/blocks/StepsTimeline/StepsTimeline";
import { TerritorySearch } from "@/components/blocks/TerritorySearch/TerritorySearch";
import Link from "next/link";
import { WeekPlanner } from "@/components/blocks/WeekPlanner/WeekPlanner";
import { WeekStorySwitcher } from "@/components/blocks/WeekStory/WeekStorySwitcher";
import { Section } from "@/components/layout/Section/Section";
import { Reveal } from "@/components/motion/Reveal/Reveal";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { Heading } from "@/components/ui/Heading/Heading";
import { Icon } from "@/components/ui/Icon/Icon";
import { Lead } from "@/components/ui/Lead/Lead";
import { PhotoFigure, photoSizes } from "@/components/ui/PhotoFigure/PhotoFigure";
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
 * Accueil : les douze blocs de docs/01 §4, enrichis par docs/design/CONCEPT.md §3.
 * Alternance des fonds : paper → white → teal → paper → sand → white → teal → paper (docs/02 §2).
 * Bloc 1 : `HeroPicker` (« Pour qui cherchez-vous de l'aide ? ») entre le chapô et les boutons ;
 *   le choix sans panneau (« Je ne sais pas encore ») mène au rappel avec `?motif=<id>`.
 * Bloc 2 : `SituationPanel`, dont les situations par public viennent des MDX des piliers.
 * Bloc 3 : masqué en entier quand aucun engagement n'est affichable.
 * Blocs 3, 4, 6 : engagements, stades et étapes sur le fil (`ThreadRail`, révélation incluse),
 *   icônes des nœuds données par accueil.json.
 * Bloc 5 : sélecteur segmenté des trois semaines types (`WeekStorySwitcher`), grille et photo
 *   de l'exemple ; le premier exemple est rendu par le serveur.
 * Bloc 7 : carte « devis » de repli tant que content/tarifs.json est vide, sans aucun chiffre.
 * Photos de section (blocs 4, 5, 6, 8) : docs/design/PHOTOS.md §2, jamais en `priority`.
 * Révélations : `Reveal` sur les grilles et cartes, jamais autour du hero, d'un formulaire ni
 * d'une zone aria-live ; sans JavaScript rien n'est caché.
 */

/** Identifiant du titre du bloc 2 : cible du défilement et du focus après un choix. */
const SITUATIONS_ID = "situations";

/** Paramètre ajouté au lien du choix sans panneau : la page de rappel affiche `motifs[id]`. */
const MOTIF_PARAM = "motif";

export default async function Home() {
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

  const journey = page.banniere.parcours;
  const panelPublics = journey ? await loadPanelPublics(journey.choix) : [];
  const withPanel = new Set(panelPublics.map((p) => p.id));

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

  const shownCommitments = visibleCommitments(page.engagements.items, engagements);
  const validated = new Set(engagements.filter((e) => e.valide).map((e) => e.code));
  const steps = page.etapes.items.map((step) => {
    const showCommitment =
      step.texte_engagement !== undefined &&
      (!isProduction() || (step.engagement !== undefined && validated.has(step.engagement)));
    return {
      title: step.titre,
      text: showCommitment ? `${step.texte} ${step.texte_engagement}` : step.texte,
      icone: step.icone,
    };
  });

  const weekPanels = page.semaine.onglets.flatMap((tab) => {
    const example = weekExamples.exemples.find((e) => e.id === tab.exemple);
    if (!example) return [];
    const photo = tab.photo ?? example.photo;
    return [
      {
        id: example.id,
        label: tab.libelle,
        icon: tab.icone ? <Icon name={tab.icone} size="md" tone="ink" /> : undefined,
        content: (
          <div
            className={
              photo ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start" : undefined
            }
          >
            <WeekPlanner
              title={tab.libelle}
              context={example.contexte}
              entries={example.entrees}
              texts={semaine_type}
            />
            {photo ? (
              <PhotoFigure
                src={photo.src}
                alt={photo.alt}
                focal={photo.focal}
                ratio="4:5"
                mobileRatio="16:9"
                sizes="(min-width: 64rem) 320px, 100vw"
                className="lg:sticky lg:top-24"
              />
            ) : null}
          </div>
        ),
      },
    ];
  });

  const featuredService = pricing.prestations.find(isDisplayablePrice);
  const bannerPhoto = page.banniere.photo;
  const neuroPhoto = page.neuro.photo;
  const stepsPhoto = page.etapes.photo;
  const relativesPhoto = page.proches.photo;

  const situationCards = page.situations.cartes.map((carte) => (
    <li key={carte.href} className="max-w-none">
      <SituationCard
        quote={carte.citation}
        text={carte.texte}
        href={carte.href}
        linkLabel={carte.lien}
        icon={carte.icone}
        className="h-full"
      />
    </li>
  ));

  return (
    <main id="contenu">
      <ParcoursProvider>
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
            thread={
              bannerPhoto ? { fil: "bras-lies", knot: page.banniere.noeud ?? "50% 78%" } : null
            }
            media={
              bannerPhoto ? (
                <PhotoFigure
                  src={bannerPhoto.src}
                  alt={bannerPhoto.alt}
                  focal={bannerPhoto.focal}
                  ratio="4:5"
                  mobileRatio="16:9"
                  radius={28}
                  sizes={photoSizes.hero}
                  priority
                />
              ) : undefined
            }
            gesture={
              journey ? (
                <HeroPicker
                  question={journey.question}
                  choices={journey.choix.map((choice) => ({
                    id: choice.id,
                    libelle: choice.libelle,
                    icone: choice.icone,
                    href: choice.pour
                      ? choice.href
                      : withParam(choice.href, MOTIF_PARAM, choice.id),
                    panel: withPanel.has(choice.id),
                  }))}
                  panelTitleId={SITUATIONS_ID}
                />
              ) : undefined
            }
          />
        </Section>

        <Section tone="white" aria-labelledby={SITUATIONS_ID}>
          {journey ? (
            <SituationPanel
              titleId={SITUATIONS_ID}
              heading={page.situations.h2}
              lead={page.situations.texte}
              texts={journey}
              publics={panelPublics}
              autreHref={navigation.demande_href}
            >
              {situationCards}
            </SituationPanel>
          ) : (
            <>
              <Heading level={2} id={SITUATIONS_ID}>
                {page.situations.h2}
              </Heading>
              <Lead className="mt-3">{page.situations.texte}</Lead>
              <Reveal
                as="ul"
                variant="stagger"
                className="m-0 mt-8 grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3"
              >
                {situationCards}
              </Reveal>
            </>
          )}
        </Section>
      </ParcoursProvider>

      {shownCommitments.length > 0 ? (
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
      ) : null}

      <Section tone="paper" aria-labelledby="neuro">
        <div
          className={
            neuroPhoto
              ? "grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[auto_1fr] lg:gap-x-12"
              : undefined
          }
        >
          <div className="lg:col-start-2">
            <Heading level={2} id="neuro">
              {page.neuro.h2}
            </Heading>
            <Lead className="mt-3">{page.neuro.texte}</Lead>
          </div>
          {neuroPhoto ? (
            <Reveal
              variant="fade"
              className="lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:self-center"
            >
              <PhotoFigure
                src={neuroPhoto.src}
                alt={neuroPhoto.alt}
                focal={neuroPhoto.focal}
                ratio="4:5"
                mobileRatio="16:9"
                sizes={photoSizes.half}
              />
            </Reveal>
          ) : null}
          <div className="lg:col-start-2">
            <StageCards
              aria-labelledby="neuro"
              stages={page.neuro.stades.map((stade) => ({
                title: stade.titre,
                text: stade.texte ? <p>{stade.texte}</p> : undefined,
                icone: stade.icone,
              }))}
            />
            <p className="m-0 mt-8">
              <Button href={page.neuro.href} variant="secondary">
                {page.neuro.bouton}
              </Button>
            </p>
          </div>
        </div>
      </Section>

      <Section tone="sand" aria-labelledby="semaine">
        <Heading level={2} id="semaine">
          {page.semaine.h2}
        </Heading>
        <Lead className="mt-3">{page.semaine.texte}</Lead>
        <Reveal className="mt-8 rounded-block bg-white p-4 shadow-1 sm:p-6">
          <WeekStorySwitcher panels={weekPanels} label={semaine_type.choisir_exemple} />
        </Reveal>
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
        <div
          className={
            stepsPhoto
              ? "mt-8 grid gap-8 lg:grid-cols-[minmax(0,40rem)_minmax(0,1fr)] lg:items-center lg:gap-x-12"
              : "mt-8"
          }
        >
          {stepsPhoto ? (
            <Reveal variant="fade" className="order-first lg:order-none lg:col-start-2">
              <PhotoFigure
                src={stepsPhoto.src}
                alt={stepsPhoto.alt}
                focal={stepsPhoto.focal}
                ratio="3:2"
                mobileRatio="16:9"
                sizes={photoSizes.half}
              />
            </Reveal>
          ) : null}
          <StepsTimeline
            aria-labelledby="etapes"
            className="max-w-2xl lg:col-start-1 lg:row-start-1"
            steps={steps}
          />
        </div>
      </Section>

      <Section tone="teal" aria-labelledby="prix">
        <Heading level={2} id="prix">
          {page.prix.h2}
        </Heading>
        <Lead className="mt-3">{page.prix.texte}</Lead>
        <Reveal variant="stagger" className="mt-8 grid gap-6 md:grid-cols-2">
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
          ) : (
            <Card
              as="article"
              className="flex flex-col"
              data-block="devis"
              aria-labelledby="devis-titre"
            >
              <Heading level={3} visual={4} id="devis-titre">
                {page.prix.carte_devis.titre}
              </Heading>
              <p className="m-0 mt-3">{page.prix.carte_devis.texte}</p>
              <p className="m-0 mt-auto pt-6">
                <Button href={navigation.rappel_href} variant="outline">
                  {boutons.rappel}
                </Button>
              </p>
            </Card>
          )}
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
        </Reveal>
      </Section>

      <Section tone="paper" aria-labelledby="proches">
        <Reveal
          className={
            relativesPhoto
              ? "grid items-center gap-8 rounded-block bg-tint-sand p-6 sm:p-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-x-12 lg:p-10"
              : "grid items-center gap-8 md:grid-cols-[1fr_auto]"
          }
        >
          {relativesPhoto ? (
            <div className="relative">
              <PhotoFigure
                src={relativesPhoto.src}
                alt={relativesPhoto.alt}
                focal={relativesPhoto.focal}
                ratio="4:5"
                mobileRatio="16:9"
                sizes="(min-width: 75rem) 440px, (min-width: 48rem) 40vw, 100vw"
              />
              <Thread
                illustration={page.proches.illustration}
                className="pointer-events-none absolute -right-2 -bottom-4 w-24 md:-right-8 md:w-32"
              />
            </div>
          ) : null}
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
          {relativesPhoto ? null : (
            <Thread illustration={page.proches.illustration} className="mx-auto w-40 md:w-56" />
          )}
        </Reveal>
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
