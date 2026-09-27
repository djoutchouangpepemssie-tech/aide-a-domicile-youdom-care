import type { Metadata } from "next";
import { Breadcrumb } from "@/components/blocks/Breadcrumb/Breadcrumb";
import { Section } from "@/components/layout/Section/Section";
import { LexiqueIndex, type LexiqueIndexGroup } from "@/components/lexique/LexiqueIndex";
import { Button } from "@/components/ui/Button/Button";
import { Heading } from "@/components/ui/Heading/Heading";
import { Lead } from "@/components/ui/Lead/Lead";
import { groupLexiqueByLetter, LEXIQUE_PATH, listLexiqueTerms } from "@/content/lexique";
import { getInterfaceTexts, getLexiquePage, getNavigation, getSiteConfig } from "@/content/loader";
import { definedTermSet } from "@/lib/jsonld/defined-term";
import { JsonLd } from "@/lib/jsonld/JsonLd";
import { pageMetadata } from "@/lib/seo/metadata";

/*
 * Index du lexique, /lexique/ (docs/06 §6, P7.2) : fil d'Ariane, H1, chapô, puis l'index
 * alphabétique (lettres ancrées, filtrage côté client facultatif) et l'appel. Données
 * structurées : `DefinedTermSet` « Lexique du Fil » avec ses termes ; `BreadcrumbList` par le
 * fil d'Ariane. Statique ; indexable (le lexique définit des dispositifs, pas un contenu de
 * santé : aucun statut de relecture).
 */

export function generateMetadata(): Metadata {
  const page = getLexiquePage();
  return pageMetadata({
    titre: page.seo.titre,
    description: page.seo.description,
    chemin: LEXIQUE_PATH,
  });
}

export async function buildLexiqueIndexGroups(): Promise<LexiqueIndexGroup[]> {
  const terms = await listLexiqueTerms();
  return groupLexiqueByLetter(terms).map((group) => ({
    lettre: group.lettre,
    termes: group.termes.map((term) => ({
      slug: term.slug,
      terme: term.terme,
      ...(term.developpe ? { developpe: term.developpe } : {}),
      definition: term.definition,
      ...(term.variantes ? { variantes: term.variantes } : {}),
    })),
  }));
}

export default async function LexiqueIndexPage() {
  const page = getLexiquePage();
  const navigation = getNavigation();
  const { boutons, fil_ariane, lexique } = getInterfaceTexts();
  const terms = await listLexiqueTerms();
  const groups = await buildLexiqueIndexGroups();
  const jsonLd = definedTermSet({ name: lexique.ensemble_nom }, getSiteConfig(), terms);

  return (
    // D-032 : chaque famille de pages porte sa couleur de scène (ici azure pour le lexique).
    <main id="contenu" data-famille="lexique">
      <JsonLd data={jsonLd} />
      <Section tone="paper" aria-labelledby="titre" className="scene scene-soutenu">
        <Breadcrumb texts={fil_ariane} items={[{ label: page.ariane }]} className="mb-6" />
        <Heading level={1} id="titre">
          {page.h1}
        </Heading>
        <Lead className="mt-5 max-w-3xl">{page.chapo}</Lead>
      </Section>

      <Section tone="white" aria-label={page.ariane}>
        <LexiqueIndex groups={groups} texts={page.recherche} lettresNom={page.lettres_nom} />
      </Section>

      <Section tone="teal" aria-labelledby="appel">
        <Heading level={2} id="appel">
          {page.appel.h2}
        </Heading>
        <Lead className="mt-3 max-w-3xl">{page.appel.texte}</Lead>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button href={navigation.rappel_href}>{boutons.rappel}</Button>
          <Button href={navigation.demande_href} variant="outline">
            {boutons.demande_detaillee}
          </Button>
        </div>
      </Section>
    </main>
  );
}
