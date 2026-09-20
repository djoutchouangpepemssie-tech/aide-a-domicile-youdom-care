import { RelatedLinks } from "@/components/blocks/RelatedLinks/RelatedLinks";
import { listBuildableServicePages } from "@/content/services";
import type { ServicePage } from "@/content/service-schema";
import type { InterfaceTexts } from "@/content/schemas";
import { relatedLinks } from "@/lib/seo/related";

/*
 * « À lire aussi » d'une page service, calculé au rendu (composant serveur asynchrone) à partir
 * des pages construites : en production, une page `a_relire` n'est jamais liée. Le gabarit
 * l'emploie quand les liens ne lui ont pas été fournis (`ServiceTemplateData.related`).
 */

export const RELATED_HEADING_ID = "a-lire-aussi";

export interface ServiceRelatedProps {
  page: ServicePage;
  texts: InterfaceTexts["service"];
}

export async function ServiceRelated({ page, texts }: ServiceRelatedProps) {
  const pages = await listBuildableServicePages();
  const links = relatedLinks(
    page,
    pages.map((p) => p.meta),
    { publics: texts.publics },
  );
  return (
    <RelatedLinks
      id={RELATED_HEADING_ID}
      title={texts.a_lire_aussi_h2}
      links={links}
      publics={texts.publics}
      current={page.public}
    />
  );
}
