import { getSpecialForms } from "@/content/loader";
import { OG_CONTENT_TYPE, OG_SIZE, ogAlt, renderOgImage } from "@/lib/og/render";

export const alt = ogAlt(getSpecialForms().sortie_hospitalisation.h1);
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({
    title: getSpecialForms().sortie_hospitalisation.h1,
    illustration: "maison",
  });
}
