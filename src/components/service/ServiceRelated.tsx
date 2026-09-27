import { RelatedLinks } from "@/components/blocks/RelatedLinks/RelatedLinks";
import { themeBlocks, ThemeLinksBlock } from "@/components/blocks/RelatedLinks/ThemeLinks";
import { listBuildableServicePages } from "@/content/services";
import type { ServicePage } from "@/content/service-schema";
import type { InterfaceTexts } from "@/content/schemas";
import { relatedLinks } from "@/lib/seo/related";

/*
 * « À lire aussi » d'une page service, calculé au rendu (composant serveur asynchrone) à partir
 * des pages construites : en production, une page `a_relire` n'est jamais liée. Le gabarit
 * l'emploie quand les liens ne lui ont pas été fournis (`ServiceTemplateData.related`). À la
 * suite, les blocs thématiques « Sur Le Fil » et « Dans le lexique » (P9.4) : articles et termes
 * qui citent la page dans `piliers_lies` ou `pages_liees`.
 */

export const RELATED_HEADING_ID = "a-lire-aussi";

export interface ServiceRelatedProps {
  page: ServicePage;
  texts: InterfaceTexts["service"];
}

export async function ServiceRelated({ page, texts }: ServiceRelatedProps) {
  const pages = await listBuildableServicePages();
  const themes = await themeBlocks(page.chemin);
  const links = relatedLinks(
    page,
    pages.map((p) => p.meta),
    { publics: texts.publics },
  );
  return (
    <>
      <RelatedLinks
        id={RELATED_HEADING_ID}
        title={texts.a_lire_aussi_h2}
        links={links}
        publics={texts.publics}
        current={page.public}
      />
      <ThemeLinksBlock blocks={themes} className="mt-12" />
    </>
  );
}
