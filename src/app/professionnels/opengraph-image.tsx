import { getProfessionalsPage } from "@/content/loader";
import { OG_CONTENT_TYPE, OG_SIZE, ogAlt, renderOgImage } from "@/lib/og/render";

/* Image Open Graph de /professionnels/ (P8.1) : le H1 de la page, le tracé des mains. */

export const alt = ogAlt(getProfessionalsPage().h1);
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({ title: getProfessionalsPage().h1, illustration: "mains" });
}
