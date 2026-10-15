import { getAccessibilityPage } from "@/content/loader";
import { OG_CONTENT_TYPE, OG_SIZE, ogAlt, renderOgImage } from "@/lib/og/render";

/* Image Open Graph de la déclaration d'accessibilité : son H1, le tracé du carnet (docs/04 §2). */

export const alt = ogAlt(getAccessibilityPage().h1);
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({ title: getAccessibilityPage().h1, illustration: "carnet" });
}
