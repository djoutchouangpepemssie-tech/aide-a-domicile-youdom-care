import { getRecruitmentPage } from "@/content/loader";
import { OG_CONTENT_TYPE, OG_SIZE, ogAlt, renderOgImage } from "@/lib/og/render";

/*
 * Image Open Graph de la page de candidature. Le fichier de /recrutement/ ne couvre pas cette
 * route : une image de métadonnées vaut pour son segment, pas pour ses enfants (mesuré, docs/04 §2).
 */

export const alt = ogAlt(getRecruitmentPage().postuler.h1);
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({ title: getRecruitmentPage().postuler.h1, illustration: "carnet" });
}
