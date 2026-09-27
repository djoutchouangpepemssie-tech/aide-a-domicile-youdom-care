import { getConditionsGenerales } from "@/content/legal";
import { OG_CONTENT_TYPE, OG_SIZE, ogAlt, renderOgImage } from "@/lib/og/render";

export const alt = ogAlt(getConditionsGenerales().h1);
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({ title: getConditionsGenerales().h1, illustration: "carnet" });
}
