import { getRecruitmentPage } from "@/content/loader";
import { OG_CONTENT_TYPE, OG_SIZE, ogAlt, renderOgImage } from "@/lib/og/render";

/* Image Open Graph de /recrutement/ et de ses pages (offres, candidature) : le H1, le tracé du carnet. */

export const alt = ogAlt(getRecruitmentPage().h1);
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({ title: getRecruitmentPage().h1, illustration: "carnet" });
}
