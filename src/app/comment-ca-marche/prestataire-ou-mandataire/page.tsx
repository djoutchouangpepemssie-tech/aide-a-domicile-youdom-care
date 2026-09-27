import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { MandataireNotice } from "@/components/blocks/MandataireNotice/MandataireNotice";
import { Section } from "@/components/layout/Section/Section";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { Thread } from "@/components/ui/Thread/Thread";
import { themeBlocks, ThemeLinksBlock } from "@/components/blocks/RelatedLinks/ThemeLinks";
import { getInterfaceTexts, getModesPage, getNavigation, getSiteConfig } from "@/content/loader";
import { pageMetadata } from "@/lib/seo/metadata";

/*
 * « Prestataire ou mandataire » (docs/03 §9, docs/07 §1) : tableau comparatif réel, la question
 * qui tranche, mention légale du mode mandataire. Aucun prix ici : les tarifs vivent sur la page
 * Tarifs et aides. La page n'existe que si les deux modes figurent dans site.config.json.
 */

export function generateMetadata(): Metadata {
  const { seo } = getModesPage();
  return pageMetadata({
    titre: seo.titre,
    description: seo.description,
    chemin: "/comment-ca-marche/prestataire-ou-mandataire/",
  });
}

export default async function ModesPage() {
  const page = getModesPage();
  const { modes_intervention } = getSiteConfig();
  const navigation = getNavigation();
  const { boutons, fil_ariane, mandataire_notice, tarifs } = getInterfaceTexts();
  const hasMandataire = modes_intervention.includes("mandataire");
  const parentLabel =
    navigation.principale.find((item) => item.id === "comment-ca-marche")?.libelle ??
    "Comment ça marche";

  const choices = [page.question.non, page.question.oui];

  const themes = await themeBlocks("/comment-ca-marche/prestataire-ou-mandataire/");
  return (
    <main id="contenu">
      <Section tone="paper" aria-labelledby="titre">
        <Breadcrumb
          texts={fil_ariane}
          items={[{ label: parentLabel, href: "/comment-ca-marche/" }, { label: page.ariane }]}
          className="mb-6"
        />
        <div className="grid items-center gap-10 lg:grid-cols-[3fr_2fr]">
          <div>
            <Heading level={1} id="titre">
              {page.h1}
            </Heading>
            <Lead className="mt-5">{page.chapo}</Lead>
          </div>
          <Thread illustration="mains" className="mx-auto w-full max-w-xs lg:max-w-none" />
        </div>
      </Section>

      <Section tone="white" aria-labelledby="tableau">
        <Heading level={2} id="tableau">
          {page.tableau.h2}
        </Heading>
        {/* Zone défilante sur petit écran : focusable au clavier et nommée (règle axe scrollable-region-focusable). */}
        <div
          className="mt-8 overflow-x-auto focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-focus"
          tabIndex={0}
          role="region"
          aria-label={page.tableau.legende}
        >
          <table className="w-full border-collapse">
            <caption className="sr-only">{page.tableau.legende}</caption>
            <thead>
              <tr className="border-b-2 border-teal-700">
                <th scope="col" className="p-3 text-left">
                  {page.tableau.colonnes.critere}
                </th>
                <th scope="col" className="p-3 text-left">
                  {page.tableau.colonnes.prestataire}
                </th>
                <th scope="col" className="p-3 text-left">
                  {page.tableau.colonnes.mandataire}
                </th>
              </tr>
            </thead>
            <tbody>
              {page.tableau.lignes.map((ligne) => (
                <tr key={ligne.critere} className="border-b border-line align-top">
                  <th scope="row" className="p-3 text-left font-bold">
                    {ligne.critere}
                  </th>
                  <td className="p-3">{ligne.prestataire}</td>
                  <td className="p-3">{ligne.mandataire}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="m-0 mt-4 text-small text-text-soft">{page.tableau.note}</p>
        {hasMandataire ? (
          <MandataireNotice texts={mandataire_notice} className="mt-6 max-w-3xl" />
        ) : null}
        <p className="m-0 mt-6">
          <Link
            href={page.liens.tarifs.href}
            className="inline-flex min-h-11 items-center font-bold"
          >
            {page.liens.tarifs.libelle}
          </Link>
        </p>
      </Section>

      <Section tone="teal" aria-labelledby="question">
        <Heading level={2} id="question">
          {page.question.h2}
        </Heading>
        <Lead className="mt-3">{page.question.texte}</Lead>
        <ul className="m-0 mt-8 grid list-none gap-6 p-0 md:grid-cols-2">
          {choices.map((choice) => (
            <Card as="li" key={choice.mode} className="max-w-none" data-mode={choice.mode}>
              <Heading level={3} visual={4}>
                {choice.titre}
              </Heading>
              <p className="m-0 mt-3">{choice.texte}</p>
              <p className="m-0 mt-4 inline-block rounded-full bg-teal-50 px-3 py-1 text-small font-bold">
                {tarifs.mode.replace("{mode}", tarifs.modes[choice.mode])}
              </p>
            </Card>
          ))}
        </ul>
      </Section>

      <Section tone="paper" aria-labelledby="appel">
        <Heading level={2} id="appel">
          {page.appel.h2}
        </Heading>
        <Lead className="mt-3">{page.appel.texte}</Lead>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button href={navigation.rappel_href}>{boutons.rappel}</Button>
          <Button href={navigation.demande_href} variant="outline">
            {boutons.demande_detaillee}
          </Button>
        </div>
      </Section>

      <ThemeLinksBlock blocks={themes} section="paper" />
    </main>
  );
}
