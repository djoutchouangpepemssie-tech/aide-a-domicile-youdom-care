import { getServicesPage } from "@/content/loader";
import { OG_CONTENT_TYPE, OG_SIZE, ogAlt, renderOgImage } from "@/lib/og/render";

/* Image Open Graph de l'index des services : son H1, le tracé des mains (docs/04 §2). */

export const alt = ogAlt(getServicesPage().h1);
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({ title: getServicesPage().h1, illustration: "mains" });
}
