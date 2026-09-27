import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  LexiqueTemplate,
  type LexiqueLinkedPage,
  type LexiqueTemplateData,
} from "@/components/lexique/LexiqueTemplate";
import { getAidPage } from "@/content/aid-pages";
import {
  getLexiqueTerm,
  lexiqueLinkTargets,
  lexiqueTermPath,
  listLexiqueTerms,
  neighbourTerms,
} from "@/content/lexique";
import type { LexiqueTerm } from "@/content/lexique-schema";
import {
  getAgenciesPage,
  getCaregiverCheckPage,
  getInterfaceTexts,
  getLexiquePage,
  getModesPage,
  getNavigation,
  getPricingPage,
  getRegionPage,
  getSiteConfig,
} from "@/content/loader";
import { getServicePage } from "@/content/services";
import { lexiqueTermJsonLd } from "@/lib/jsonld/defined-term";
import { JsonLd } from "@/lib/jsonld/JsonLd";
import { compileLexiqueBody } from "@/lib/mdx/compile-lexique";
import { pageMetadata } from "@/lib/seo/metadata";

/*
 * Page d'un terme du lexique, /lexique/{slug}/ (docs/06 §6, P7.2) : une route par fichier
 * content/lexique/{slug}.json, construite au build ; un slug inconnu renvoie 404. Métadonnées
 * par `pageMetadata` (canonique, Open Graph : l'image vient de opengraph-image.tsx du dossier).
 * Données structurées (docs/04 §2) : `DefinedTerm` dans le `DefinedTermSet` « Lexique du Fil »
 * et `WebPage` datée ; `BreadcrumbList` par le fil d'Ariane, `Organization` par le pied de page.
 * Les pages liées ne gardent que les pages construites (en production, une page service
 * `a_relire` n'existe pas) ; leur libellé vient du contenu de la page cible.
 */

type TermRouteProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export async function generateStaticParams() {
  const terms = await listLexiqueTerms();
  return terms.map((term) => ({ slug: term.slug }));
}

export async function generateMetadata({ params }: TermRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const term = await getLexiqueTerm(slug);
  if (!term) return {};
  return pageMetadata({
    titre: term.seo.titre,
    description: term.seo.description,
    chemin: lexiqueTermPath(slug),
  });
}

/** Libellé d'une page interne construite, ou `null` si la page n'existe pas dans ce build. */
export async function linkedPageLabel(href: string): Promise<string | null> {
  const texts = getInterfaceTexts();
  const navigation = getNavigation();
  const statics: Record<string, string | undefined> = {
    "/": texts.fil_ariane.accueil,
    "/tarifs-et-aides/": getPricingPage().ariane,
    "/comment-ca-marche/": navigation.principale.find((item) => item.id === "comment-ca-marche")
      ?.libelle,
    "/comment-ca-marche/prestataire-ou-mandataire/": getModesPage().ariane,
    "/aide-a-domicile/": getRegionPage().ariane,
    "/aidants/ou-en-etes-vous/": getCaregiverCheckPage().ariane,
    "/agences/": getAgenciesPage().index.ariane,
    "/lexique/": getLexiquePage().ariane,
  };
  const known = statics[href];
  if (known) return known;
  const aid = /^\/tarifs-et-aides\/([a-z0-9-]+)\/$/.exec(href);
  if (aid?.[1]) return getAidPage(aid[1])?.ariane ?? null;
  const service = await getServicePage(href);
  if (service) {
    if (service.meta.type === "pilier") return texts.service.publics[service.meta.public];
    // Libellé du menu s'il existe (« Garde de nuit »), sinon le libellé court, sinon le H1.
    const menu = navigation.principale
      .flatMap((item) => item.enfants ?? [])
      .find((child) => child.href === href)?.libelle;
    return menu ?? service.meta.libelle_court ?? service.meta.h1;
  }
  return null;
}

async function linkedPages(term: LexiqueTerm): Promise<LexiqueLinkedPage[]> {
  const pages: LexiqueLinkedPage[] = [];
  for (const href of term.pages_liees) {
    const label = await linkedPageLabel(href);
    if (label) pages.push({ href, label });
  }
  return pages;
}

export async function buildLexiqueData(slug: string): Promise<LexiqueTemplateData | null> {
  const term = await getLexiqueTerm(slug);
  if (!term) return null;
  const terms = await listLexiqueTerms();
  const texts = getInterfaceTexts();
  const navigation = getNavigation();
  const page = getLexiquePage();
  const Body = await compileLexiqueBody(slug, term.explication, await lexiqueLinkTargets());
  return {
    term,
    Body,
    texts: texts.lexique,
    breadcrumb: texts.fil_ariane,
    lexiqueAriane: page.ariane,
    sources: {
      source_verifiee: texts.page_aide.source_verifiee,
      source_consultee: texts.page_aide.source_consultee,
      lien_externe: texts.aides.lien_externe,
    },
    linked: await linkedPages(term),
    neighbours: neighbourTerms(terms, term).map((neighbour) => ({
      slug: neighbour.slug,
      terme: neighbour.terme,
      ...(neighbour.developpe ? { developpe: neighbour.developpe } : {}),
      definition: neighbour.definition,
    })),
    appel: page.appel,
    buttons: { rappel: texts.boutons.rappel, demande: texts.boutons.demande_detaillee },
    navigation: { rappel_href: navigation.rappel_href, demande_href: navigation.demande_href },
  };
}

export default async function LexiqueTermRoute({ params }: TermRouteProps) {
  const { slug } = await params;
  const data = await buildLexiqueData(slug);
  if (!data) notFound();
  const jsonLd = lexiqueTermJsonLd(data.term, { name: data.texts.ensemble_nom }, getSiteConfig());
  return (
    <>
      <JsonLd data={jsonLd} />
      <LexiqueTemplate data={data} />
    </>
  );
}
