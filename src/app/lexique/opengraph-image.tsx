import { getLexiquePage, getSiteConfig } from "@/content/loader";
import { OG_CONTENT_TYPE, OG_SIZE, ogAlt, renderOgImage } from "@/lib/og/render";

/* Image Open Graph de l'index du lexique : le H1 de content/pages/lexique.json. */

export const alt = ogAlt(getLexiquePage().h1);
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  const { marque } = getSiteConfig();
  return renderOgImage({
    title: getLexiquePage().h1 || marque.description_courte,
    illustration: "mains",
  });
}
