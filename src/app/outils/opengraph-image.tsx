import { getToolsPage } from "@/content/tool-pages";
import { OG_CONTENT_TYPE, OG_SIZE, ogAlt, renderOgImage } from "@/lib/og/render";

/* Image Open Graph de l'index des outils à imprimer : son H1, le tracé du carnet (docs/04 §2). */

export const alt = ogAlt(getToolsPage().h1);
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({ title: getToolsPage().h1, illustration: "carnet" });
}
