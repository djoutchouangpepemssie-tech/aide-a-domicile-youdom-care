import type { LocalData, LocalEditorial } from "@/content/local-schema";
import type { SiteConfig } from "@/content/schemas";
import { faqPage } from "./faq-page";
import { absoluteUrl, filled, jsonLdNode, organizationId, type JsonLdNode } from "./types";

/*
 * Nœuds d'une page locale (docs/04 §4, src/app/aide-a-domicile/[...chemin]/page.tsx) :
 * `WebPage` (titre moteur, H1 en `headline`, description, `dateModified` = `maj` de
 * l'éditorial, auteur nommé, éditeur par `@id`, territoire en `about`), puis `FAQPage` avec les
 * questions locales telles qu'affichées. `Organization` vient du pied de page et
 * `BreadcrumbList` du fil d'Ariane. Aucune adresse ici : celle de l'agence la plus proche
 * relève du `LocalBusiness` de sa propre page.
 */

export function localWebPage(
  data: Pick<LocalData, "chemin" | "nom" | "kind">,
  editorial: Pick<LocalEditorial, "seo" | "auteur" | "maj">,
  h1: string,
  config: SiteConfig,
): JsonLdNode | null {
  const siteUrl = config.marque.url;
  if (!filled(siteUrl) || !filled(data.chemin) || !filled(editorial.seo.titre)) return null;
  const url = absoluteUrl(data.chemin, siteUrl);
  return jsonLdNode("WebPage", {
    "@id": url,
    url,
    name: editorial.seo.titre,
    headline: filled(h1) ? h1 : undefined,
    description: filled(editorial.seo.description) ? editorial.seo.description : undefined,
    inLanguage: "fr-FR",
    dateModified: editorial.maj,
    author: filled(editorial.auteur.nom)
      ? {
          "@type": "Person",
          name: editorial.auteur.nom,
          jobTitle: filled(editorial.auteur.fonction) ? editorial.auteur.fonction : undefined,
        }
      : undefined,
    publisher: { "@id": organizationId(siteUrl) },
    about: filled(data.nom)
      ? { "@type": data.kind === "departement" ? "AdministrativeArea" : "Place", name: data.nom }
      : undefined,
  });
}

export function localPageJsonLd(
  data: LocalData,
  editorial: LocalEditorial,
  h1: string,
  config: SiteConfig,
): JsonLdNode[] {
  const nodes = [
    localWebPage(data, editorial, h1, config),
    faqPage(editorial.questions, { chemin: data.chemin, siteUrl: config.marque.url }),
  ];
  return nodes.filter((node): node is JsonLdNode => node !== null);
}
