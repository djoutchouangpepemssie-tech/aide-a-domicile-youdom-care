import { getAidPage, listAidPageIds } from "@/content/aid-pages";
import { getPricingPage, getSiteConfig } from "@/content/loader";
import { OG_CONTENT_TYPE, OG_SIZE, ogAlt, renderOgImage } from "@/lib/og/render";

/* Une image par page d'aide (H1 de content/aides/{id}.json), mêmes paramètres que la page. */

type AidImageProps = { params: Promise<{ aide: string }> };

export const alt = ogAlt(getSiteConfig().marque.signature);
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return listAidPageIds().map((aide) => ({ aide }));
}

export default async function Image({ params }: AidImageProps) {
  const { aide } = await params;
  const page = getAidPage(aide);
  return renderOgImage({ title: page?.h1 ?? getPricingPage().h1, illustration: "tasse" });
}
