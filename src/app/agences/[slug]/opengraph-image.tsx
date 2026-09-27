import { getAgenciesPage, getSiteConfig } from "@/content/loader";
import { OG_CONTENT_TYPE, OG_SIZE, ogAlt, renderOgImage } from "@/lib/og/render";

/* Une image par page d'agence (nom de l'agence, site.config.json), mêmes paramètres que la page. */

type AgencyImageProps = { params: Promise<{ slug: string }> };

export const alt = ogAlt(getSiteConfig().marque.signature);
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return getSiteConfig().agences.map((agency) => ({ slug: agency.id }));
}

export default async function Image({ params }: AgencyImageProps) {
  const { slug } = await params;
  const agency = getSiteConfig().agences.find((a) => a.id === slug);
  return renderOgImage({
    title: agency?.nom ?? getAgenciesPage().index.h1,
    illustration: "maison",
  });
}
