import type { Metadata } from "next";
import Link from "next/link";
import { Commitments } from "@/components/blocks/Commitments/Commitments";
import { FollowUpTimeline } from "@/components/blocks/FollowUpTimeline/FollowUpTimeline";
import { SourcesList } from "@/components/blocks/SourcesList/SourcesList";
import { StageCards } from "@/components/blocks/StageCards/StageCards";
import { StepsTimeline } from "@/components/blocks/StepsTimeline/StepsTimeline";
import { WeekPlanner } from "@/components/blocks/WeekPlanner/WeekPlanner";
import { WeekStory, type WeekStoryExample } from "@/components/blocks/WeekStory/WeekStory";
import { Callout } from "@/components/ui/Callout/Callout";
import { Heading } from "@/components/ui/Heading/Heading";
import type { IconName } from "@/components/ui/Icon/icons";
import { Lead } from "@/components/ui/Lead/Lead";
import { getCommitments, getInterfaceTexts, getWeekExamples } from "@/content/loader";
import { pageMetadata } from "@/lib/seo/metadata";
import { MotionSimulator } from "../mouvement/MotionSimulator";

export const metadata: Metadata = pageMetadata({
  titre: "Guide de styles — Blocs reliés par le fil",
  description: "Page de travail : les blocs que le fil relie, avec leurs révélations.",
  chemin: "/styleguide/blocs/",
  noindex: true,
});

/*
 * Page de travail (noindex, exclue du plan de site comme /styleguide/) : les blocs que le fil
 * relie (docs/design/CONCEPT.md §2 « Il relie pour de vrai », §3, §5, §6), avec le simulateur
 * de mouvement réduit. Les textes des exemples sont des textes de démonstration ; les semaines
 * types et les jalons du suivi viennent de content/.
 */

const sections = [
  { id: "reglages", label: "Réglages" },
  { id: "stades", label: "StageCards : trois stades sur le fil" },
  { id: "etapes", label: "StepsTimeline : étapes sur le fil vertical" },
  { id: "suivi", label: "FollowUpTimeline : le suivi" },
  { id: "engagements", label: "Commitments : les engagements" },
  { id: "semaine", label: "WeekPlanner et WeekStory : la semaine type" },
  { id: "frontiere", label: "Callout frontiere : ce que nous ne faisons pas" },
  { id: "sources", label: "SourcesList : sources et relecture" },
] as const;

const stages = [
  {
    title: "Début",
    text: <p>Faire avec, pas à la place : rappels, rendez-vous, relais du conjoint.</p>,
    icone: "memoire" as const,
  },
  {
    title: "Stade modéré",
    text: <p>Présence quotidienne, repères stables, mêmes visages.</p>,
    icone: "compagnie" as const,
  },
  {
    title: "Stade avancé",
    text: <p>Présence étendue ou continue, coordination avec les soignants.</p>,
    icone: "nuit" as const,
  },
];

const steps = [
  {
    title: "Nous vous écoutons.",
    text: "Un appel d’un quart d’heure pour comprendre la situation. Sans jargon, sans engagement.",
    icone: "telephone" as const,
  },
  {
    title: "Nous venons vous voir.",
    text: "Une évaluation à domicile, gratuite, avec la personne et ses proches.",
    icone: "maison" as const,
  },
  {
    title: "Nous vous présentons l’équipe.",
    text: "Vous rencontrez les intervenants avant le premier jour.",
    icone: "compagnie" as const,
  },
  {
    title: "Nous ajustons.",
    text: "Un cahier de liaison, un point régulier, et l’accompagnement évolue avec vous.",
    icone: "cahier-de-liaison" as const,
  },
];

const followUpIcons: Readonly<Record<string, IconName>> = {
  "Avant de commencer": "maison",
  "Première semaine": "compagnie",
  "Chaque mois": "calendrier",
  "Quand les besoins changent": "cahier-de-liaison",
};

const commitmentItems = [
  {
    engagement: "E1",
    titre: "Des intervenants formés à la situation.",
    texte: "Préparés à la maladie ou au handicap de la personne, pas seulement au métier.",
    icone: "memoire" as const,
  },
  {
    engagement: "E2",
    titre: "Des visages connus.",
    texte: "Une petite équipe stable, présentée avant de commencer.",
    icone: "compagnie" as const,
  },
  {
    engagement: "E3",
    titre: "Un suivi que vous pouvez lire.",
    texte: "Le cahier de liaison, à la maison, et un point régulier avec vous.",
    icone: "cahier-de-liaison" as const,
  },
  {
    engagement: "E4",
    titre: "Là quand ça se complique.",
    texte: "Une sortie d’hôpital, une nuit difficile : nous adaptons l’accompagnement.",
    icone: "nuit" as const,
  },
];

const weekExampleIds = [
  { id: "suzanne", icone: "maison" as const },
  { id: "noe", icone: "ecole" as const },
  { id: "bernard", icone: "retour-hopital" as const },
];

const demoSources = [
  {
    libelle: "service-public.gouv.fr — L’allocation personnalisée d’autonomie (APA)",
    href: "https://www.service-public.gouv.fr/particuliers/vosdroits/F10009",
    verifie_le: "2026-06-01",
    consulte_le: "2026-09-20",
  },
  {
    libelle: "impots.gouv.fr — Crédit d’impôt pour l’emploi d’un salarié à domicile",
    href: "https://www.impots.gouv.fr/particulier/emploi-domicile",
    consulte_le: "2026-09-20",
  },
  {
    libelle: "urssaf.fr — Le service Cesu",
    href: "https://www.urssaf.fr/accueil/particulier-employeur.html",
    verifie_le: "2026-03-12",
    consulte_le: "2026-09-20",
  },
] as const;

export default function BlocsPage() {
  const texts = getInterfaceTexts();
  const { engagements, suivi } = getCommitments();
  const weekExamples = getWeekExamples().exemples;
  const madeleine = weekExamples.find((example) => example.id === "madeleine");
  if (!madeleine) throw new Error("semaines-types.json : exemple « madeleine » introuvable");
  const storyExamples: WeekStoryExample[] = weekExampleIds.flatMap(({ id, icone }) => {
    const example = weekExamples.find((candidate) => candidate.id === id);
    if (!example) return [];
    return [
      {
        id: example.id,
        label: example.titre.split(",").slice(0, 2).join(","),
        story: `${example.contexte ?? example.titre} Le récit de l’exemple vient de la page service (80 à 120 mots) ; ici, une phrase de démonstration suffit.`,
        photo: example.photo,
        icone,
      },
    ];
  });

  return (
    <main id="contenu" className="container-site py-12">
      <p className="text-small text-text-soft">
        Page de travail, non indexée. <Link href="/styleguide/">Retour au guide de styles</Link>
        {" · "}
        <Link href="/styleguide/mouvement/">Mouvement</Link>
      </p>
      <Heading level={1}>Les blocs reliés par le fil</Heading>
      <Lead className="mt-4">
        Le fil relie pour de vrai : segments et nœuds sont des tracés SVG qui se dessinent une fois,
        quand le bloc entre dans l’écran. Tout est visible d’emblée sans JavaScript et en mouvement
        réduit.
      </Lead>

      <nav aria-labelledby="sommaire" className="mt-8 rounded-card border border-line bg-white p-5">
        <Heading level={2} id="sommaire" visual={4}>
          Sommaire
        </Heading>
        <ol className="m-0 mt-3 grid list-none gap-x-6 gap-y-2 p-0 sm:grid-cols-2">
          {sections.map((section) => (
            <li key={section.id} className="max-w-none">
              <a href={`#${section.id}`} className="inline-flex min-h-12 items-center">
                {section.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <section aria-labelledby="reglages" className="mt-12">
        <Heading level={2} id="reglages">
          Réglages
        </Heading>
        <div className="mt-4">
          <MotionSimulator />
        </div>
      </section>

      <section aria-labelledby="stades" className="mt-16">
        <Heading level={2} id="stades">
          StageCards : trois stades sur le fil
        </Heading>
        <p className="mt-3">
          Fil vertical sur mobile, horizontal à partir de 48 rem ; nœud framboise sur le dernier
          stade ; les trois cartes entrent à trois profondeurs (0, 12, 24 px) et s’alignent. Chaque
          stade porte un identifiant (<code>stade-1</code>…) qu’un geste de hero peut cibler ;{" "}
          <code>data-active</code> sur le jalon déplace le nœud framboise et borde la carte en teal
          : « vous êtes ici ».
        </p>
        <StageCards aria-labelledby="stades" className="mt-8" stages={stages} />
        <Heading level={3} visual={4} className="mt-10">
          Avec le deuxième stade actif (<code>active={"{1}"}</code>)
        </Heading>
        <StageCards
          className="mt-4"
          stages={stages}
          ids={["demo-stade-1", "demo-stade-2", "demo-stade-3"]}
          active={1}
        />
      </section>

      <section aria-labelledby="etapes" className="mt-16">
        <Heading level={2} id="etapes">
          StepsTimeline : étapes sur le fil vertical
        </Heading>
        <p className="mt-3">
          Liste ordonnée, numéro ou icône dans chaque nœud, segments du fil entre les nœuds ; chaque
          étape se révèle quand le trait l’atteint (200 ms d’écart).
        </p>
        <StepsTimeline aria-labelledby="etapes" className="mt-8 max-w-2xl" steps={steps} />
      </section>

      <section aria-labelledby="suivi" className="mt-16">
        <Heading level={2} id="suivi">
          FollowUpTimeline : le suivi
        </Heading>
        <p className="mt-3">
          Jalons de <code>engagements.json</code> ; vertical sur mobile, horizontal à partir de 48
          rem ; icône 24 px facultative par moment.
        </p>
        <FollowUpTimeline
          aria-labelledby="suivi"
          className="mt-8"
          milestones={suivi.jalons}
          icons={followUpIcons}
        />
      </section>

      <section aria-labelledby="engagements" className="mt-16">
        <Heading level={2} id="engagements">
          Commitments : les engagements
        </Heading>
        <p className="mt-3">
          Quatre engagements sur le fil : vertical sur mobile, horizontal à partir de 64 rem, un
          nœud par engagement, le dernier framboise. Textes de démonstration ; en production, seuls
          les engagements validés s’affichent et la section disparaît s’il n’en reste aucun.
        </p>
        <Commitments
          aria-labelledby="engagements"
          className="mt-8"
          items={commitmentItems}
          commitments={engagements}
        />
      </section>

      <section aria-labelledby="semaine" className="mt-16">
        <Heading level={2} id="semaine">
          WeekPlanner et WeekStory : la semaine type
        </Heading>
        <p className="mt-3">
          <code>week-fill</code> : les cases remplies apparaissent case par case, 20 ms d’écart, une
          fois ; le nombre d’heures du résumé se compte (600 ms), sa valeur finale est rendue côté
          serveur. En dessous, le récit avec un sélecteur segmenté quand plusieurs exemples sont
          fournis.
        </p>
        <div className="mt-8 rounded-block bg-white p-4 shadow-1 sm:p-6">
          <WeekPlanner
            title={madeleine.titre}
            context={madeleine.contexte}
            entries={madeleine.entrees}
            texts={texts.semaine_type}
          />
        </div>
        <WeekStory
          className="mt-8"
          examples={storyExamples}
          selectorLabel={texts.semaine_type.choisir_exemple}
          mention={texts.semaine_type.prenom_fictif}
        />
      </section>

      <section aria-labelledby="frontiere" className="mt-16">
        <Heading level={2} id="frontiere">
          Callout frontiere : ce que nous ne faisons pas
        </Heading>
        <p className="mt-3">
          Une décision, pas un avertissement : bloc sable, trait du fil de 3 px à gauche, deux
          colonnes à partir de 48 rem quand un relais est donné, icône croix ouverte, ligne de fin.
          Aucun mouvement, aucun rouge.
        </p>
        <Callout
          variant="frontiere"
          className="mt-8"
          subtitle={texts.service.frontiere.sous_titre}
          columns={{
            faits: texts.service.frontiere.colonne_faits,
            relais: texts.service.frontiere.colonne_relais,
          }}
          items={[
            {
              texte: "Les soins infirmiers et les actes médicaux.",
              relais: "les infirmiers, le SSIAD, l’HAD",
            },
            {
              texte: "Les diagnostics et les décisions de soins.",
              relais: "le médecin traitant, les spécialistes",
            },
            { texte: "Le ménage lourd et les gros travaux." },
          ]}
          footer={texts.service.frontiere.ligne_fin}
        />
        <Heading level={3} visual={4} className="mt-10">
          Sans relais : une seule colonne, contenu libre
        </Heading>
        <Callout variant="frontiere" className="mt-4">
          <ul className="m-0 list-disc pl-5">
            <li>Aucun geste médical : ils relèvent des professionnels de santé.</li>
            <li>Aucun conseil sur un traitement : parlez-en à votre médecin.</li>
          </ul>
        </Callout>
      </section>

      <section aria-labelledby="sources" className="mt-16">
        <Heading level={2} id="sources">
          SourcesList : sources et relecture
        </Heading>
        <p className="mt-3">
          Domaine en pastille, dates en chiffres tabulaires, lien externe signalé ; carte de
          relecture (écrit par, relu par ou en attente, mise à jour). Sources de démonstration.
        </p>
        <SourcesList
          className="mt-8"
          sources={demoSources}
          texts={{ ...texts.page_aide, lien_externe: texts.aides.lien_externe }}
          review={{
            author: "Écrit par la rédaction Youdom Care",
            reviewer: null,
            pending: texts.service.relecture_attendue,
            updated: "Mise à jour le 20 septembre 2026",
          }}
        />
      </section>
    </main>
  );
}
