import type { LexiqueTerm } from "@/content/lexique-schema";
import type { SiteConfig } from "@/content/schemas";
import {
  absoluteUrl,
  compact,
  filled,
  jsonLdNode,
  organizationId,
  type JsonLdNode,
  type JsonLdObject,
} from "./types";

/*
 * `DefinedTerm` et `DefinedTermSet` (docs/04 §2 : lexique). Chaque page de terme émet un
 * `DefinedTerm` (`name`, `alternateName` = développé, `description` = définition en une
 * phrase, `url`) rattaché au `DefinedTermSet` « Lexique du Fil » (/lexique/#lexique), et une
 * `WebPage` datée par `maj`. L'index /lexique/ émet le `DefinedTermSet` avec ses termes
 * (`hasDefinedTerm`). `BreadcrumbList` vient du fil d'Ariane, `Organization` du pied de page.
 * Aucune valeur inventée : un champ vide disparaît (`compact`).
 */

export const LEXIQUE_PATH = "/lexique/";
export const LEXIQUE_SET_FRAGMENT = "#lexique";

export interface DefinedTermSetInput {
  /** Nom du lexique (« Lexique du Fil »). */
  name: string;
  description?: string;
}

export type DefinedTermInput = Pick<LexiqueTerm, "slug" | "terme" | "developpe" | "definition">;

export function lexiqueTermUrl(slug: string, siteUrl: string): string {
  return absoluteUrl(`${LEXIQUE_PATH}${slug}/`, siteUrl);
}

export function definedTermSetId(siteUrl: string): string {
  return `${absoluteUrl(LEXIQUE_PATH, siteUrl)}${LEXIQUE_SET_FRAGMENT}`;
}

function setFields(set: DefinedTermSetInput, siteUrl: string): JsonLdObject {
  return {
    "@id": definedTermSetId(siteUrl),
    name: set.name,
    description: set.description,
    url: absoluteUrl(LEXIQUE_PATH, siteUrl),
  };
}

function termFields(term: DefinedTermInput, siteUrl: string): JsonLdObject {
  const url = lexiqueTermUrl(term.slug, siteUrl);
  return {
    "@id": `${url}#terme`,
    name: term.terme,
    alternateName: filled(term.developpe) ? term.developpe : undefined,
    description: term.definition,
    url,
  };
}

/** Le lexique entier (index) : `DefinedTermSet` et, s'ils sont fournis, ses termes. */
export function definedTermSet(
  set: DefinedTermSetInput,
  config: SiteConfig,
  terms?: readonly DefinedTermInput[],
): JsonLdNode | null {
  const siteUrl = config.marque.url;
  if (!filled(siteUrl) || !filled(set.name)) return null;
  return jsonLdNode("DefinedTermSet", {
    ...setFields(set, siteUrl),
    hasDefinedTerm: terms?.map((term) =>
      compact({ "@type": "DefinedTerm", ...termFields(term, siteUrl) }),
    ),
  });
}

/** Un terme, rattaché à son lexique. */
export function definedTerm(
  term: DefinedTermInput,
  set: DefinedTermSetInput,
  config: SiteConfig,
): JsonLdNode | null {
  const siteUrl = config.marque.url;
  if (!filled(siteUrl) || !filled(term.slug) || !filled(term.terme) || !filled(term.definition)) {
    return null;
  }
  return jsonLdNode("DefinedTerm", {
    ...termFields(term, siteUrl),
    inDefinedTermSet: filled(set.name)
      ? compact({ "@type": "DefinedTermSet", ...setFields(set, siteUrl) })
      : undefined,
  });
}

/** La page du terme : `WebPage` datée par `maj`, éditée par l'organisation. */
export function lexiqueWebPage(
  term: Pick<LexiqueTerm, "slug" | "seo" | "terme" | "maj">,
  config: SiteConfig,
): JsonLdNode | null {
  const siteUrl = config.marque.url;
  if (!filled(siteUrl) || !filled(term.slug) || !filled(term.seo.titre) || !filled(term.maj)) {
    return null;
  }
  const url = lexiqueTermUrl(term.slug, siteUrl);
  return jsonLdNode("WebPage", {
    "@id": url,
    url,
    name: term.seo.titre,
    headline: term.terme,
    description: term.seo.description,
    inLanguage: "fr-FR",
    dateModified: term.maj,
    publisher: { "@id": organizationId(siteUrl) },
  });
}

/** Nœuds d'une page de terme : `DefinedTerm` puis `WebPage`. */
export function lexiqueTermJsonLd(
  term: Pick<LexiqueTerm, "slug" | "terme" | "developpe" | "definition" | "seo" | "maj">,
  set: DefinedTermSetInput,
  config: SiteConfig,
): JsonLdNode[] {
  return [definedTerm(term, set, config), lexiqueWebPage(term, config)].filter(
    (node): node is JsonLdNode => node !== null,
  );
}
