import type { SiteConfig } from "@/content/schemas";
import { absoluteUrl, filled, jsonLdNode, organizationId, type JsonLdNode } from "@/lib/jsonld";

/*
 * `WebPage` des pages d'outils (docs/04 §2) : titre moteur, H1 en `headline`, description,
 * `dateModified` = `maj` du contenu, éditeur par `@id`. Le `BreadcrumbList` vient du fil
 * d'Ariane et l'`Organization` du pied de page. Aucun auteur : un outil n'est pas un article.
 */
export interface ToolWebPageInput {
  titre: string;
  description: string;
  chemin: string;
  h1: string;
  maj: string;
}

export function toolWebPage(page: ToolWebPageInput, config: SiteConfig): JsonLdNode | null {
  const siteUrl = config.marque.url;
  if (!filled(siteUrl) || !filled(page.titre) || !filled(page.chemin) || !filled(page.maj)) {
    return null;
  }
  const url = absoluteUrl(page.chemin, siteUrl);
  return jsonLdNode("WebPage", {
    "@id": url,
    url,
    name: page.titre,
    headline: filled(page.h1) ? page.h1 : undefined,
    description: filled(page.description) ? page.description : undefined,
    inLanguage: "fr-FR",
    dateModified: page.maj,
    publisher: { "@id": organizationId(siteUrl) },
  });
}
