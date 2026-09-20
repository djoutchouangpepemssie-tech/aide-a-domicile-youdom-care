import { getFormDefinitionBySlug, listFormDefinitions } from "@/content/form-definitions";
import { getRequestIndexPage, getSiteConfig } from "@/content/loader";
import { OG_CONTENT_TYPE, OG_SIZE, ogAlt, renderOgImage } from "@/lib/og/render";

/* Une image par formulaire détaillé (H1 de content/formulaires/{id}.json), mêmes paramètres que la page. */

type RequestImageProps = { params: Promise<{ cas: string }> };

export const alt = ogAlt(getSiteConfig().marque.signature);
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return listFormDefinitions().map((definition) => ({ cas: definition.slug }));
}

export default async function Image({ params }: RequestImageProps) {
  const { cas } = await params;
  const definition = getFormDefinitionBySlug(cas);
  return renderOgImage({
    title: definition?.h1 ?? getRequestIndexPage().h1,
    illustration: "carnet",
  });
}
