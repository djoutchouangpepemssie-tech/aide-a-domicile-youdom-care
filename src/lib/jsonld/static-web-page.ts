import type { SiteConfig } from "@/content/schemas";
import { absoluteUrl, filled, jsonLdNode, organizationId, type JsonLdNode } from "./types";

/*
 * `WebPage` d'une page statique de fonctionnement ou d'entreprise (docs/04 §2 : Professionnels,
 * Recrutement) : titre moteur, H1 en `headline`, description, `dateModified` = date déclarée du
 * contenu (src/lib/seo/sitemaps.ts › declaredLastmod), éditeur par `@id`. Le `BreadcrumbList`
 * vient du fil d'Ariane et l'`Organization` du pied de page. Aucun auteur, aucune date inventée :
 * sans date déclarée, le nœud n'est pas émis.
 */

export interface StaticWebPageInput {
  titre: string;
  description: string;
  chemin: string;
  h1: string;
  /** Date de la dernière révision du contenu, AAAA-MM-JJ. */
  maj: string | undefined;
}

export function staticWebPage(page: StaticWebPageInput, config: SiteConfig): JsonLdNode | null {
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
