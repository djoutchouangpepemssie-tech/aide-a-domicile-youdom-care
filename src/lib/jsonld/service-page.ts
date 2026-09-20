import type { SiteConfig } from "@/content/schemas";
import type { ServicePage } from "@/content/service-schema";
import { faqPage } from "./faq-page";
import { service } from "./service";
import type { JsonLdNode } from "./types";
import { medicalWebPage, webPage } from "./web-page";

/*
 * Nœuds d'une page service ou pathologie (src/app/[...chemin]/page.tsx) : `Service`, puis
 * `MedicalWebPage` si la pathologie est relue, sinon `WebPage`, puis `FAQPage` avec les
 * questions de la section 11. `Organization` vient du pied de page et `BreadcrumbList` du fil
 * d'Ariane : ils ne sont pas répétés ici.
 */

export function servicePageJsonLd(
  page: ServicePage,
  config: SiteConfig,
  audienceType?: string | null,
): JsonLdNode[] {
  const nodes = [
    service(page, config, audienceType),
    medicalWebPage(page, config) ?? webPage(page, config),
    faqPage(page.faq, { chemin: page.chemin, siteUrl: config.marque.url }),
  ];
  return nodes.filter((node): node is JsonLdNode => node !== null);
}
