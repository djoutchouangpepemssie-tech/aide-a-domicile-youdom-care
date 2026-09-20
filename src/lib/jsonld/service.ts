import type { SiteConfig } from "@/content/schemas";
import type { ServicePage } from "@/content/service-schema";
import { areaServed } from "./organization";
import { absoluteUrl, filled, organizationId, jsonLdNode, type JsonLdNode } from "./types";

/*
 * `Service` (docs/04 §2 : pages services et pathologies). `serviceType` est le H1 de la page,
 * `name` son titre court (balise titre), `provider` l'organisation par référence `@id`,
 * `areaServed` les départements de site.config.json, `audience` le libellé du public tel qu'il
 * est affiché sur la page (interface.json > service.publics) ; absent pour un service transverse.
 */

export type ServiceInput = Pick<
  ServicePage,
  "titre" | "description" | "chemin" | "h1" | "public" | "libelle_court"
>;

export function service(
  page: ServiceInput,
  config: SiteConfig,
  audienceType?: string | null,
): JsonLdNode | null {
  const siteUrl = config.marque.url;
  if (!filled(siteUrl) || !filled(page.h1) || !filled(page.description) || !filled(page.chemin)) {
    return null;
  }
  const audience =
    page.public !== "transverse" && filled(audienceType)
      ? { "@type": "PeopleAudience", audienceType }
      : undefined;
  return jsonLdNode("Service", {
    "@id": `${absoluteUrl(page.chemin, siteUrl)}#service`,
    name: filled(page.titre) ? page.titre : page.h1,
    serviceType: page.h1,
    description: page.description,
    url: absoluteUrl(page.chemin, siteUrl),
    provider: { "@id": organizationId(siteUrl) },
    areaServed: areaServed(config.zones),
    audience,
  });
}
