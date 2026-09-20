import { getHowItWorksPage } from "@/content/loader";
import { OG_CONTENT_TYPE, OG_SIZE, ogAlt, renderOgImage } from "@/lib/og/render";

export const alt = ogAlt(getHowItWorksPage().h1);
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({ title: getHowItWorksPage().h1, illustration: "carnet" });
}
