import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { Section } from "@/components/layout/Section/Section";
import { PrintButton } from "@/components/outils/PrintButton/PrintButton";
import { toolWebPage } from "@/components/outils/tool-jsonld";
import { ToolSheet } from "@/components/outils/ToolSheet/ToolSheet";
import { Button } from "@/components/ui/Button/Button";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { groupCards, GroupLinksBlock } from "@/components/blocks/RelatedLinks/GroupLinks";
import { getInterfaceTexts, getNavigation, getSiteConfig } from "@/content/loader";
import {
  getToolPage,
  getToolsPage,
  listToolIds,
  TOOLS_PATH,
  toolPath,
  toolPdfPath,
} from "@/content/tool-pages";
import { JsonLd } from "@/lib/jsonld/JsonLd";
import { pageMetadata } from "@/lib/seo/metadata";

/*
 * /outils/{slug}/ (docs/06 §7, P7.7) : la page d'un outil à imprimer. À l'écran : fil d'Ariane,
 * bouton « J'imprime cet outil » (seule île client), lien vers le PDF balisé, puis le document
 * lui-même (ToolSheet). À l'impression : le document seul, sur une page A4 ou deux
 * (src/styles/print.css) ; c'est aussi ce que capture scripts/pdf/outils.ts.
 */

type ToolRouteProps = { params: Promise<{ outil: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return listToolIds().map((outil) => ({ outil }));
}

export async function generateMetadata({ params }: ToolRouteProps): Promise<Metadata> {
  const { outil } = await params;
  const tool = getToolPage(outil);
  if (!tool) return {};
  return pageMetadata({
    titre: tool.seo.titre,
    description: tool.seo.description,
    chemin: toolPath(outil),
  });
}

export default async function ToolRoute({ params }: ToolRouteProps) {
  const { outil } = await params;
  const tool = getToolPage(outil);
  if (!tool) notFound();

  const toolsPage = getToolsPage();
  const siteConfig = getSiteConfig();
  const navigation = getNavigation();
  const { boutons, fil_ariane, outils, page_aide, aides } = getInterfaceTexts();
  const jsonLd = toolWebPage(
    {
      titre: tool.seo.titre,
      description: tool.seo.description,
      chemin: toolPath(outil),
      h1: tool.h1,
      maj: tool.maj,
    },
    siteConfig,
  );

  const groupLinks = await groupCards(toolPath(outil));
  return (
    <main id="contenu" data-tool-page>
      <JsonLd data={jsonLd} />
      <Section tone="paper" aria-label={tool.ariane} className="pb-0!">
        <Breadcrumb
          texts={fil_ariane}
          items={[{ label: toolsPage.ariane, href: TOOLS_PATH }, { label: tool.ariane }]}
          className="mb-6"
        />
        <div
          data-tool-actions
          className="flex flex-wrap items-center gap-4 rounded-card border border-line bg-white px-5 py-4 shadow-1"
        >
          <PrintButton>{outils.imprimer}</PrintButton>
          <Button href={toolPdfPath(outil)} variant="outline" download>
            {outils.telecharger}
          </Button>
          <p className="m-0 max-w-none text-small text-text-soft">
            {outils.pdf_precision}. {outils.donnees}
          </p>
        </div>
      </Section>

      <Section tone="paper" aria-label={tool.h1} data-tool-sheet-section>
        <ToolSheet
          tool={tool}
          brand={{ nom: siteConfig.marque.nom, url: siteConfig.marque.url }}
          texts={{
            outils,
            sources: {
              source_verifiee: page_aide.source_verifiee,
              source_consultee: page_aide.source_consultee,
              lien_externe: aides.lien_externe,
            },
          }}
        />
        <p className="m-0 mt-8 text-center" data-print="hide">
          <Link href={TOOLS_PATH} className="inline-flex min-h-12 items-center font-bold">
            {outils.retour}
          </Link>
        </p>
      </Section>

      <Section tone="white" aria-labelledby="appel" data-print="hide">
        <Heading level={2} id="appel">
          {toolsPage.appel.h2}
        </Heading>
        <Lead className="mt-3">{toolsPage.appel.texte}</Lead>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button href={navigation.rappel_href} variant="secondary">
            {boutons.rappel}
          </Button>
          <Button href={navigation.demande_href} variant="outline">
            {boutons.demande_detaillee}
          </Button>
        </div>
      </Section>

      <GroupLinksBlock links={groupLinks} printable={false} />
    </main>
  );
}
