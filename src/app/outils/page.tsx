import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { Section } from "@/components/layout/Section/Section";
import { toolWebPage } from "@/components/outils/tool-jsonld";
import { Button } from "@/components/ui/Button/Button";
import { Callout } from "@/components/ui/Callout/Callout";
import { Card } from "@/components/ui/Card/Card";
import { Heading } from "@/components/ui/Heading/Heading";
import { Icon } from "@/components/ui/Icon/Icon";
import { Lead } from "@/components/ui/Lead/Lead";
import { groupCards, GroupLinksBlock } from "@/components/blocks/RelatedLinks/GroupLinks";
import { getInterfaceTexts, getNavigation, getSiteConfig } from "@/content/loader";
import {
  getToolsPage,
  latestToolUpdate,
  listToolPages,
  TOOLS_PATH,
  toolPath,
  toolPdfPath,
} from "@/content/tool-pages";
import { JsonLd } from "@/lib/jsonld/JsonLd";
import { pageMetadata } from "@/lib/seo/metadata";

/*
 * /outils/ (docs/06 §7, P7.7) : les cinq documents à imprimer, offerts sans e-mail ni compte.
 * Textes : content/pages/outils.json ; outils : content/outils/{slug}.json. Chaque carte mène
 * à la page de l'outil (version écran et impression) et au PDF balisé de public/outils/.
 */

export function generateMetadata(): Metadata {
  const { seo } = getToolsPage();
  return pageMetadata({ titre: seo.titre, description: seo.description, chemin: TOOLS_PATH });
}

export default async function ToolsIndexPage() {
  const page = getToolsPage();
  const tools = listToolPages();
  const siteConfig = getSiteConfig();
  const navigation = getNavigation();
  const { boutons, fil_ariane, outils } = getInterfaceTexts();
  const jsonLd = toolWebPage(
    {
      titre: page.seo.titre,
      description: page.seo.description,
      chemin: TOOLS_PATH,
      h1: page.h1,
      maj: latestToolUpdate(),
    },
    siteConfig,
  );

  const groupLinks = await groupCards("/outils/");
  return (
    // D-032 : scène verte pour la famille des outils à imprimer.
    <main id="contenu" data-famille="outils">
      <JsonLd data={jsonLd} />
      <Section tone="paper" aria-labelledby="titre" className="scene scene-soutenu print:!bg-white">
        <Breadcrumb texts={fil_ariane} items={[{ label: page.ariane }]} className="mb-6" />
        <Heading level={1} id="titre">
          {page.h1}
        </Heading>
        <Lead className="mt-5">{page.chapo}</Lead>
      </Section>

      <Section tone="white" aria-labelledby="liste">
        <Heading level={2} id="liste">
          {page.liste_h2}
        </Heading>
        <ul className="m-0 mt-8 grid list-none gap-6 p-0 md:grid-cols-2 xl:grid-cols-3">
          {tools.map((tool) => (
            <Card key={tool.id} as="li" interactive className="flex max-w-none flex-col">
              <Icon name={tool.icone} size="lg" tone="teal" />
              <Heading level={3} visual={4} className="mt-4">
                <Link
                  href={toolPath(tool.id)}
                  className="inline-flex min-h-11 items-center text-ink no-underline hover:underline"
                >
                  {tool.h1}
                </Link>
              </Heading>
              <p className="m-0 mt-2 max-w-none text-text-soft">{tool.sous_titre}</p>
              <p className="m-0 mt-auto flex flex-wrap items-center gap-x-6 gap-y-1 pt-5">
                <Link
                  href={toolPath(tool.id)}
                  className="inline-flex min-h-12 items-center font-bold"
                  aria-label={`${outils.voir} : ${tool.ariane}`}
                >
                  {outils.voir}
                </Link>
                <a
                  href={toolPdfPath(tool.id)}
                  className="inline-flex min-h-12 items-center gap-2"
                  aria-label={`${outils.telecharger} : ${tool.ariane}`}
                >
                  {outils.telecharger}
                  <span className="rounded-full bg-teal-50 px-2 py-0.5 text-small font-bold text-teal-800">
                    PDF
                  </span>
                </a>
              </p>
            </Card>
          ))}
        </ul>
      </Section>

      <Section tone="teal" aria-label={page.confiance.titre}>
        <Callout variant="bon-a-savoir" title={page.confiance.titre} className="max-w-2xl">
          <p>{page.confiance.texte}</p>
        </Callout>
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

      <GroupLinksBlock links={groupLinks} />
    </main>
  );
}
