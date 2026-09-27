import { getAgenciesPage } from "@/content/loader";
import { OG_CONTENT_TYPE, OG_SIZE, ogAlt, renderOgImage } from "@/lib/og/render";

/* Image Open Graph de l'index des agences (H1 de content/pages/agences.json). */

export const alt = ogAlt(getAgenciesPage().index.h1);
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({ title: getAgenciesPage().index.h1, illustration: "maison" });
}
