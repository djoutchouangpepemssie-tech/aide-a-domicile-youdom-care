import { getCaregiverCheckPage } from "@/content/loader";
import { OG_CONTENT_TYPE, OG_SIZE, ogAlt, renderOgImage } from "@/lib/og/render";

export const alt = ogAlt(getCaregiverCheckPage().h1);
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({ title: getCaregiverCheckPage().h1, illustration: "tasse" });
}
