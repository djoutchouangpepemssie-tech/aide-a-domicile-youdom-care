import { getRegionPage } from "@/content/loader";
import { OG_CONTENT_TYPE, OG_SIZE, ogAlt, renderOgImage } from "@/lib/og/render";

/* Image Open Graph de la carte régionale (H1 de content/pages/aide-a-domicile.json). */

export const alt = ogAlt(getRegionPage().h1);
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({ title: getRegionPage().h1, illustration: "maison" });
}
