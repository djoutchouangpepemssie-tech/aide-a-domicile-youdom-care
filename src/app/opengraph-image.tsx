import { getHomePage, getSiteConfig } from "@/content/loader";
import { OG_CONTENT_TYPE, OG_SIZE, ogAlt, renderOgImage } from "@/lib/og/render";

/* Image Open Graph de l'accueil, et repli pour toute page sans image propre. */

export const alt = ogAlt(getSiteConfig().marque.signature);
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({ title: getHomePage().banniere.h1, illustration: "maison" });
}
